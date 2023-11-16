require("dotenv").config();
const express = require("express");
const cors = require("cors");

const fs = require("fs");
const util = require("util");

const unlinkFile = util.promisify(fs.unlink);

const multer = require("multer");
const upload = multer({ dest: "uploads/" });

const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { s3, bucketName, PutObjectCommand, GetObjectCommand } = require("./s3");

const app = express();

app.use(cors());

app.post("/image", upload.single("image"), validateFile, async (req, res) => {
  const file = req.file;
  const fileStream = fs.createReadStream(file.path);

  const fileType = file.mimetype.replace("image/", "");
  const imageName = `${generateRandomName()}.${fileType}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: imageName,
    Body: fileStream,
    ContentType: "image/jpeg",
  });

  const result = await s3.send(command);
  const singedUrl = new GetObjectCommand({
    Bucket: bucketName,
    Key: imageName,
  });
  const imageUrl = await getSignedUrl(s3, singedUrl, {
    expiresIn: 2 * 60 * 60,
  });

  res.send({ imageUrl });
  unlinkFile(file.path); // remove file was created from uploads folder
});

app.listen(8080, () => console.info("listening on port 8080"));

function validateFile(req, res, next) {
  if (!req.file) return res.status(400).send({ message: "No file to upload!" });
  next();
}

function generateRandomName() {
  const length = 15;
  const characters =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-";
  let imageNameString = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    imageNameString += characters.charAt(randomIndex);
  }

  const timestamp = new Date().getTime();
  const imageName = `${imageNameString}_${timestamp}`;

  return imageName;
}
