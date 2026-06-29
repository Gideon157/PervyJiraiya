const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { S3Client } = require("@aws-sdk/client-s3");

const r2 = new S3Client({
  region: "auto",

  endpoint: process.env.R2_ENDPOINT,

  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function generateSignedUrl(fileName, expiresIn = 7200) {

  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: fileName,
  });

  return await getSignedUrl(r2, command, {
    expiresIn,
  });

}

module.exports = {
  r2,
  generateSignedUrl,
};
