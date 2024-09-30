const express = require("express");
const multer = require("multer");
const {
  s3,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
} = require("./s3");
require("dotenv").config();

const upload = multer();
const uploadMultiPartRouter = express.Router();

uploadMultiPartRouter.post("/start-upload", async (req, res) => {
  const { fileName, fileType } = req.body;

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileName,
    ContentType: fileType,
  };

  try {
    const command = new CreateMultipartUploadCommand(params);
    const response = await s3.send(command);
    console.log({ upload: response });
    res.send({ uploadId: response.UploadId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

uploadMultiPartRouter.post(
  "/upload-part",
  upload.single("fileChunk"),
  async (req, res) => {
    const { fileName, partNumber, uploadId } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "No file chunk provided" });
    }

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileName,
      PartNumber: parseInt(partNumber),
      UploadId: uploadId,
      Body: req.file.buffer,
    };

    try {
      const command = new UploadPartCommand(params);
      const uploadPartResult = await s3.send(command);
      console.log({ uploadPartResult });
      res.send({ ETag: uploadPartResult.ETag });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }
);

uploadMultiPartRouter.post("/complete-upload", async (req, res) => {
  const { fileName, uploadId, parts } = req.body;

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileName,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts,
    },
  };

  try {
    const command = new CompleteMultipartUploadCommand(params);
    const result = await s3.send(command);
    console.log({ complete: result });
    res.send({ fileUrl: result.Location });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = { uploadMultiPartRouter };
