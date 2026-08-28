import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_BITMAP_TEXTURE_FILL,
  type BitmapTextureFill
} from "kizkatt-graphic-engine";

type BitmapTextureChangeOptions = {
  transient?: boolean;
};

export function useBitmapTextureDraft({
  onCommit,
  onPreview,
  reopenKey,
  value
}: {
  onCommit: () => void;
  onPreview: (
    texture: BitmapTextureFill,
    options?: BitmapTextureChangeOptions
  ) => void;
  reopenKey: string | number;
  value?: BitmapTextureFill;
}) {
  const [texture, setTexture] = useState<BitmapTextureFill>(() => ({
    ...DEFAULT_BITMAP_TEXTURE_FILL,
    ...value
  }));
  const [dirty, setDirty] = useState(false);
  const draftTextureRef = useRef(texture);
  const appliedTextureRef = useRef(texture);
  const previewTextureRef = useRef<BitmapTextureFill | null>(null);
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (value && value === previewTextureRef.current) {
      return;
    }

    const nextTexture = {
      ...DEFAULT_BITMAP_TEXTURE_FILL,
      ...value
    };

    setTexture(nextTexture);
    draftTextureRef.current = nextTexture;
    appliedTextureRef.current = nextTexture;
    previewTextureRef.current = null;
    setDirty(false);
    dirtyRef.current = false;
  }, [reopenKey, value]);

  const update = (
    patch: Partial<BitmapTextureFill>,
    _options?: BitmapTextureChangeOptions
  ) => {
    const nextTexture = { ...draftTextureRef.current, ...patch };

    draftTextureRef.current = nextTexture;
    previewTextureRef.current = nextTexture;
    setTexture(nextTexture);
    setDirty(true);
    dirtyRef.current = true;
    onPreview(nextTexture, { transient: true });
  };

  const apply = () => {
    appliedTextureRef.current = draftTextureRef.current;
    previewTextureRef.current = null;
    onCommit();
    setDirty(false);
    dirtyRef.current = false;
  };

  const discard = () => {
    if (!dirtyRef.current) {
      return;
    }

    const appliedTexture = appliedTextureRef.current;

    draftTextureRef.current = appliedTexture;
    previewTextureRef.current = appliedTexture;
    onPreview(appliedTexture, { transient: true });
    onCommit();
    setTexture(appliedTexture);
    setDirty(false);
    dirtyRef.current = false;
  };

  return {
    apply,
    dirty,
    discard,
    texture,
    update
  };
}
