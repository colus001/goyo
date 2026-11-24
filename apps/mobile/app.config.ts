import type { ConfigContext, ExpoConfig } from 'expo/config';
import { withBuildProperties } from 'expo-build-properties';

export default function configureApp({ config }: ConfigContext): ExpoConfig {
  if (process.env.GOYO_IOS_SCENE_SUPPORT !== '1') return config;

  return withBuildProperties(config, { ios: { enableSceneSupport: true } });
}
