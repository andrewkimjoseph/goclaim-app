import sharp from "sharp";
import { fileURLToPath } from "url";
import path from "path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

await sharp(path.join(root, "public/watermelon.svg"))
  .resize(180, 180)
  .png()
  .toFile(path.join(root, "app/apple-icon.png"));

console.log("Generated app/apple-icon.png (180x180)");
