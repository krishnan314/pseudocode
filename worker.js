let msg;
self.onmessage = function (event) {
  jscode = event.data.jscode;
  datasets = event.data.datasets;
  Table_1 = datasets.scores;
  Table_2 = [];
  // console.log(jscode);
  executionStatus = "Not Started";
  try {
    eval(jscode);
    executionStatus = "Success";
    self.postMessage(JSON.stringify(this));
    console.log("Evaluated successfully");
  } catch (e) {
    executionStatus = "Error";
    self.postMessage(e.message);
  }
};
