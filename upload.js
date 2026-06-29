
require("dotenv").config();

const fs = require("fs");
const path = require("path");

const { Upload } = require("@aws-sdk/lib-storage");

const r2 = require("./config/r2");

// ======== CONFIGURA QUI IL FILE DA CARICARE ========
const FILE_NAME = "full1.mp4";
// ===================================================

async function uploadVideo() {
  try {
    const filePath = path.join(__dirname, "private_videos", FILE_NAME);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File non trovato: ${filePath}`);
    }

    const upload = new Upload({
      client: r2,

      params: {
        Bucket: process.env.R2_BUCKET,
        Key: FILE_NAME,
        Body: fs.createReadStream(filePath),
        ContentType: "video/mp4",
      },
    });

    upload.on("httpUploadProgress", (progress) => {

      if (progress.total) {

        const percent = (
          (progress.loaded / progress.total) *
          100
        ).toFixed(1);

        process.stdout.write(`\rUpload ${percent}%`);
      }

    });

    await upload.done();

    console.log("\n\n✅ Upload completato!");

  } catch (err) {

    console.error("\n❌ Errore upload");
    console.error(err);

  }
}

uploadVideo();