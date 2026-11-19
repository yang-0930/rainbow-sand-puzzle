export const COLORS = [
  { id: 'red', name: '红色', hex: '#FF5B5B', light: '#FF9A9A', dark: '#D63939' },
  { id: 'yellow', name: '黄色', hex: '#FFC857', light: '#FFE39A', dark: '#D99A20' },
  { id: 'blue', name: '蓝色', hex: '#4D9DE0', light: '#8FC6F0', dark: '#2C74B5' },
  { id: 'green', name: '绿色', hex: '#59C98A', light: '#96E5B7', dark: '#319A62' }
];

export const COLOR_IDS = COLORS.map((color) => color.id);

export function colorByIndex(index) {
  return COLORS[index] ?? COLORS[0];
}
