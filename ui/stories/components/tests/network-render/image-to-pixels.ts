import { PromiseResolver, Vec4 } from "deltav";

/**
 * Load an image into a pixel array.
 */
export async function imageToPixels(source: string) {
  const resolver = new PromiseResolver<Vec4[][]>();
  const img = new Image();

  const doLoad = () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const { width, height } = img;
    const pixels = ctx.getImageData(0, 0, width, height).data;

    // Convert the pixel array to a 2D array of rgba values
    const pixelArray: Vec4[][] = new Array(height);

    for (let y = 0; y < height; ++y) {
      pixelArray[y] = new Array(width);

      for (let x = 0; x < width; ++x) {
        const i = (y * width + x) * 4;
        pixelArray[y][x] = [
          pixels[i] / 255,
          pixels[i + 1] / 255,
          pixels[i + 2] / 255,
          pixels[i + 3],
        ];
      }
    }

    resolver.resolve(pixelArray);
  };

  img.onload = doLoad;
  img.src = source;

  return await resolver.promise;
}
