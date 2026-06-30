require("dotenv").config();

const fs = require("fs");
const path = require("path");

const { HeadObjectCommand } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");

const { r2 } = require("./config/r2");

const folder = path.join(__dirname, "private_videos");

// Ordina i file: full1, full2, full3... full10...
const files = fs
  .readdirSync(folder)
  .filter(file => {
  const lower = file.toLowerCase();
  return lower.endsWith(".mp4") || lower.endsWith(".mov");
})
  .sort((a, b) => {
    
    const na = parseInt(a.match(/\d+/)?.[0] || 0);
    const nb = parseInt(b.match(/\d+/)?.[0] || 0);
    return na - nb;
  });
  console.log(files);

let uploaded = 0;
let skipped = 0;
let failed = 0;

async function existsOnR2(file) {

  try {

    await r2.send(new HeadObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: file,
    }));

    return true;

  } catch {

    return false;

  }

}

async function uploadFile(file) {

  const alreadyExists = await existsOnR2(file);

  if (alreadyExists) {

    console.log(`⏩ ${file} già presente su R2`);
    skipped++;
    return;

  }

  const filePath = path.join(folder, file);

  const stats = fs.statSync(filePath);

  const sizeGB = (stats.size / 1024 / 1024 / 1024).toFixed(2);

  console.log("\n=======================================");
  console.log(`📤 Uploading ${file}`);
  console.log(`📦 Size: ${sizeGB} GB`);
  console.log("=======================================\n");

  const upload = new Upload({

    client: r2,

    params: {

      Bucket: process.env.R2_BUCKET,

      Key: file,

      Body: fs.createReadStream(filePath),

      ContentType: "video/mp4",

    },

    queueSize: 4,

    partSize: 20 * 1024 * 1024,

  });

  let lastPercent = -1;

  upload.on("httpUploadProgress", progress => {

    if (!progress.total) return;

    const percent = Math.floor(
      progress.loaded / progress.total * 100
    );

    if (percent !== lastPercent) {

      process.stdout.write(`\r${file} → ${percent}%`);

      lastPercent = percent;

    }

  });

  await upload.done();

  process.stdout.write("\n");

  console.log(`✅ ${file} uploaded\n`);

  uploaded++;

}

async function main() {

  for (const file of files) {

    try {

      await uploadFile(file);

    }

    catch (err) {

      console.error(`❌ Errore su ${file}`);

      console.error(err.message);

      failed++;

    }

  }

  console.log("\n=======================================");
  console.log("UPLOAD COMPLETATO");
  console.log("=======================================");
  console.log(`✅ Caricati : ${uploaded}`);
  console.log(`⏩ Saltati  : ${skipped}`);
  console.log(`❌ Errori   : ${failed}`);
  console.log("=======================================\n");

}

main();