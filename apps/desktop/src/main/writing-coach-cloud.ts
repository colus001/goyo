import { randomUUID } from 'node:crypto';
import { AzureCliCredential } from '@azure/identity';
import { ai } from '@opencode/ai';
import { model as bedrockModel } from '@opencode/ai/providers/amazon-bedrock';
import { configure as configureAzure } from '@opencode/ai/providers/azure';
import { model as vertexModel } from '@opencode/ai/providers/google-vertex';
import { model as vertexAnthropicModel } from '@opencode/ai/providers/google-vertex/messages';
import { Auth } from '@opencode/ai/route';
import { COACH_PROVIDER_NAMES, type CoachCloudConnection } from '../shared/writing-coach';
import { CoachError } from './writing-coach-oauth';
import { COACH_INSTRUCTIONS } from './writing-coach-prompt';

const REGION = /^[a-z][a-z0-9-]{1,30}$/;
const CLOUD_NAME = /^[a-z0-9][a-z0-9-]{0,62}$/i;
const MODEL_ID = /^[a-z0-9._:@/-]{1,512}$/i;
const AZURE_SCOPE = 'https://cognitiveservices.azure.com/.default';

export function configureCloudAccount(input: CoachCloudConnection) {
  if (
    !Array.isArray(input?.modelIds) ||
    !input.modelIds.length ||
    input.modelIds.length > 200 ||
    input.modelIds.some((id) => typeof id !== 'string' || !MODEL_ID.test(id))
  ) {
    throw new CoachError('Enter one or more model or deployment IDs.');
  }
  const connection = validateCloudConnection(input);
  return {
    ...connection,
    modelIds: [...new Set(connection.modelIds)],
    id: randomUUID(),
    label: COACH_PROVIDER_NAMES[connection.providerID],
  };
}

function validateCloudConnection(input: CoachCloudConnection): CoachCloudConnection {
  const { modelIds } = input;
  switch (input.providerID) {
    case 'amazon-bedrock':
      if (
        typeof input.region !== 'string' ||
        !REGION.test(input.region) ||
        typeof input.profile !== 'string' ||
        !/^[a-z0-9_ .+@-]{0,128}$/i.test(input.profile)
      ) {
        throw new CoachError('Enter an AWS region and, optionally, a local AWS profile.');
      }
      return {
        providerID: input.providerID,
        modelIds,
        region: input.region,
        profile: input.profile,
      };
    case 'google-vertex':
      if (
        typeof input.project !== 'string' ||
        !CLOUD_NAME.test(input.project) ||
        typeof input.location !== 'string' ||
        !REGION.test(input.location)
      ) {
        throw new CoachError('Enter a Google Cloud project ID and location.');
      }
      return {
        providerID: input.providerID,
        modelIds,
        project: input.project,
        location: input.location,
      };
    case 'azure':
      if (typeof input.resource !== 'string' || !CLOUD_NAME.test(input.resource)) {
        throw new CoachError('Enter an Azure OpenAI resource name.');
      }
      return { providerID: input.providerID, modelIds, resource: input.resource };
    default:
      throw new CoachError('Unknown cloud provider.');
  }
}

export async function generateCloudReply(
  account: CoachCloudConnection,
  modelId: string,
  prompt: string,
) {
  const signal = AbortSignal.timeout(90_000);
  const model = await createModel(account, modelId, signal);
  const response = await ai.generate(
    {
      model,
      system: COACH_INSTRUCTIONS,
      prompt,
      fetch: (input, init) => fetch(input, { ...init, redirect: 'error' }),
    },
    { signal },
  );
  if (response.finishReason.normalized !== 'stop') {
    throw new CoachError(`${COACH_PROVIDER_NAMES[account.providerID]} did not finish the reply.`);
  }
  return response.text;
}

async function createModel(account: CoachCloudConnection, id: string, signal: AbortSignal) {
  switch (account.providerID) {
    case 'amazon-bedrock':
      return bedrockModel(id, {
        region: account.region,
        profile: account.profile || undefined,
        auth: account.profile ? 'sigv4' : undefined,
      });
    case 'google-vertex': {
      const config = { project: account.project, location: account.location };
      return id.startsWith('claude-') ? vertexAnthropicModel(id, config) : vertexModel(id, config);
    }
    case 'azure': {
      const credential = new AzureCliCredential({ processTimeoutInMs: 10_000 });
      const access = await credential.getToken(AZURE_SCOPE, { abortSignal: signal }).catch(() => {
        throw new CoachError(
          'Azure CLI is not connected. Run az login and select the correct subscription.',
        );
      });
      if (!access) throw new CoachError('Azure CLI did not return an access token.');
      return configureAzure({
        resourceName: account.resource,
        auth: Auth.bearer(access.token),
        http: { body: { store: false } },
      }).responses(id);
    }
  }
}
