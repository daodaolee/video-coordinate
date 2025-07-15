declare module 'react-mediainfo' {
  export function getInfo(fileOrUrl: File | string): Promise<unknown>;
}
