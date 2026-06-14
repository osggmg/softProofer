import '@testing-library/jest-dom';
import { TextDecoder, TextEncoder } from 'node:util';

if (!global.TextEncoder) {
	(globalThis as any).TextEncoder = TextEncoder;
}

if (!global.TextDecoder) {
	(globalThis as any).TextDecoder = TextDecoder;
}
