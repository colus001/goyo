import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { styles } from '../screens/mobile-library-styles';
import type { MobileAuthState } from './use-mobile-auth';

export function CloudAuthPanel({
  auth,
  clientId,
}: {
  auth: MobileAuthState;
  clientId: string | null;
}) {
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [hasSentCode, setHasSentCode] = useState(false);

  if (auth.status === 'loading') {
    return <CloudCard label="Goyo Cloud" title="Checking session..." />;
  }

  if (auth.user) {
    return <SignedInCloudCard auth={auth} />;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>Goyo Cloud</Text>
      <Text style={styles.cardTitle}>Sign in to sync</Text>
      <Text style={styles.cardBody}>Use an email code to prepare this iPhone for cloud sync.</Text>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="you@example.com"
        placeholderTextColor="#a99b8c"
        style={styles.authInput}
        value={email}
      />
      {hasSentCode ? (
        <TextInput
          keyboardType="number-pad"
          maxLength={6}
          onChangeText={(value) => setCode(value.replace(/\D/g, ''))}
          placeholder="6-digit code"
          placeholderTextColor="#a99b8c"
          style={styles.authInput}
          value={code}
        />
      ) : null}
      {auth.error ? <Text style={styles.errorText}>{auth.error}</Text> : null}
      <View style={styles.actionRow}>
        <CloudButton
          disabled={auth.isBusy || email.trim().length === 0}
          label={hasSentCode ? 'Send again' : 'Send code'}
          onPress={() => void sendCode(auth, email, setHasSentCode)}
        />
        {hasSentCode ? (
          <CloudButton
            disabled={auth.isBusy || code.length !== 6 || !clientId}
            label="Verify"
            onPress={() => void auth.verifyCode({ clientId, code, email })}
            variant="secondary"
          />
        ) : null}
      </View>
    </View>
  );
}

function CloudCard({ label, title }: { label: string; title: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardTitle}>{title}</Text>
    </View>
  );
}

function SignedInCloudCard({ auth }: { auth: MobileAuthState }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>Goyo Cloud</Text>
      <Text style={styles.cardTitle}>Signed in</Text>
      <Text style={styles.cardBody}>{auth.user?.email}</Text>
      {auth.error ? <Text style={styles.errorText}>{auth.error}</Text> : null}
      <View style={styles.actionRow}>
        <CloudButton disabled={auth.isBusy} label="Logout" onPress={auth.logout} />
      </View>
    </View>
  );
}

async function sendCode(
  auth: MobileAuthState,
  email: string,
  setHasSentCode: (hasSentCode: boolean) => void,
) {
  if (await auth.sendCode(email)) {
    setHasSentCode(true);
  }
}

function CloudButton({
  disabled,
  label,
  onPress,
  variant = 'primary',
}: {
  disabled: boolean;
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={variant === 'primary' ? styles.primaryButton : styles.secondaryButton}
    >
      <Text style={variant === 'primary' ? styles.primaryButtonText : styles.secondaryButtonText}>
        {disabled ? 'Please wait' : label}
      </Text>
    </Pressable>
  );
}
