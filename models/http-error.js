class HttpError extends Error {
  constructor(message, errorCode) {
    super(message); //add message property in the error object of the super class
    this.code = errorCode; //adds code property
  }
}

module.exports = HttpError;
