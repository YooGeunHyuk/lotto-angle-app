import { Alert, Platform } from 'react-native';

/** RN의 Alert는 웹에서 no-op이라 웹은 window.alert/confirm으로 대체한다 */

export function showAlert(title: string, message?: string, onClose?: () => void): void {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    onClose?.();
    return;
  }
  Alert.alert(title, message, [{ text: '확인', onPress: onClose }]);
}

export function showConfirm(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmLabel = '확인',
): void {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: '취소', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}
