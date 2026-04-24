import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

const C = {
  black: '#1A1A1A',
  gray: '#999999',
};

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  titleStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}

export default function ScreenHeader({
  title,
  subtitle,
  right,
  titleStyle,
  containerStyle,
}: ScreenHeaderProps) {
  return (
    <View style={[s.header, containerStyle]}>
      <View style={s.left}>
        <Text style={[s.title, titleStyle]}>{title}</Text>
        {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={s.right}>{right}</View> : null}
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 6,
    gap: 12,
  },
  left: {
    flex: 1,
  },
  right: {
    paddingTop: 2,
  },
  title: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '800',
    color: C.black,
  },
  subtitle: {
    fontSize: 11,
    lineHeight: 16,
    color: C.gray,
    marginTop: 3,
  },
});
