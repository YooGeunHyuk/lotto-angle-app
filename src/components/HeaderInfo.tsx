import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const C = {
  card: '#F7F7F7',
  border: '#EEEEEE',
  black: '#1A1A1A',
  gray: '#999999',
};

export default function HeaderInfo() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={s.wrap}>
      <TouchableOpacity style={s.infoButton} onPress={() => setIsOpen(prev => !prev)} activeOpacity={0.8}>
        <Text style={s.infoButtonText}>i</Text>
      </TouchableOpacity>
      {isOpen && (
        <Modal transparent visible animationType="none" onRequestClose={() => setIsOpen(false)}>
          <Pressable style={s.infoBackdrop} onPress={() => setIsOpen(false)}>
            <View style={s.infoBubbleWrap} pointerEvents="box-none">
              <View style={s.infoArrow} />
              <View style={s.infoBubble}>
                <Text style={s.infoText}>우주🪐의 기운을 모아</Text>
                <Text style={s.infoText}>당첨을 기원합니다! 🙏</Text>
                <Text style={s.infoEmail}>meetyuuu@gmail.com</Text>
              </View>
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: 'relative',
    alignItems: 'flex-end',
    width: 28,
    height: 50,
    justifyContent: 'flex-end',
  },
  infoButton: {
    position: 'absolute',
    top: -5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  infoButtonText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.gray,
  },
  infoBackdrop: {
    flex: 1,
  },
  infoBubbleWrap: {
    position: 'absolute',
    top: 80,
    right: 20,
    alignItems: 'flex-end',
    zIndex: 2,
  },
  infoArrow: {
    width: 10,
    height: 10,
    backgroundColor: C.card,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: C.border,
    transform: [{ rotate: '45deg' }],
    marginRight: 12,
    marginBottom: -5,
    zIndex: 1,
  },
  infoBubble: {
    width: 172,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  infoText: {
    fontSize: 11,
    lineHeight: 17,
    color: C.gray,
    textAlign: 'center',
  },
  infoEmail: {
    fontSize: 11,
    lineHeight: 17,
    color: C.black,
    marginTop: 4,
    textAlign: 'center',
  },
});
