import { createContext, useContext, type ReactNode } from "react";

export type TextureSourceResolver = (textureId: string) => string | null;

const EMPTY_TEXTURE_SOURCE_RESOLVER: TextureSourceResolver = () => null;
const TextureSourceContext = createContext<TextureSourceResolver>(
  EMPTY_TEXTURE_SOURCE_RESOLVER
);

export function TextureSourceProvider({
  children,
  resolveTextureSource
}: {
  children: ReactNode;
  resolveTextureSource: TextureSourceResolver;
}) {
  return (
    <TextureSourceContext.Provider value={resolveTextureSource}>
      {children}
    </TextureSourceContext.Provider>
  );
}

export function useTextureSource(textureId: string) {
  return useContext(TextureSourceContext)(textureId);
}
