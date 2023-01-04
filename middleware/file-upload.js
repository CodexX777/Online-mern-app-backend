const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

const MIME_TYPE = {
  "image/png": "png",
  "image/jpg": "jpg",
  "image/jpeg": "jpeg",
};



const fileUpload = multer({
  limits: 5000000,
  storage: multer.memoryStorage({
    filename: (req, file, cb) => {
      const ext = MIME_TYPE[file.mimetype];
      cb(null, uuidv4() + "." + ext);
    },
  }),

  filefilter: (req, file, cb) => {
    const isValid = !!MIME_TYPE[file.mimetype];

    let error = isValid ? null : new Error("Invalid mime type");

    cb(error, isValid);

  },
});

module.exports = fileUpload;
