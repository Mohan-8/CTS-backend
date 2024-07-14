const { constants } = require("../constants");

const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode ? res.statusCode : 500;
  let title = "Error";
  switch (statusCode) {
    case constants.VALIDATION_ERROR:
      title = "Validation Failed";
      break;
    case constants.UNAUTHORIZED:
      title = "Un-Authorized";
      break;
    case constants.FORBIDDEN:
      title = "Forbidden";
      break;
    case constants.NOT_FOUND:
      title = "Not Found";
      break;
    case constants.SERVER_ERROR:
      title = "Server Error";
      break;
    case constants.Data_ER:
      title = "Registration failed.";
      break;
    default:
      console.log("No error");
  }
  res.json({
    title: title,
    message: err.message,
    stackTrace: err.stack,
  });
};

module.exports = errorHandler;
