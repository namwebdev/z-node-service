const express = require("express");

const fs = require("fs");
const util = require("util");


const unlinkFile = util.promisify(fs.unlink);

const multer = require("multer");
const upload = multer({ dest: "uploads/" });

const { uploadFile } = require("./s3");

const app = express();

app.post("/images",validateFile, upload.single("image"), async (req, res) => {

  if (!req.file) return res.status(400).send({ message: "No file to upload!" });
console.log(req.file)
  // const file = req.file;

  const result = await uploadFile(file);
  await unlinkFile(file.path);

  res.send({ imageUrl: result.Location });
});

app.listen(8080, () => console.info("listening on port 8080"));

function validateFile(req,res,next) {
  console.log(req.body, req.files)
  next()
}