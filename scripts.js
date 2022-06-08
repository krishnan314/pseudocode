let editor = document.getElementById("code-editor");
editor.value = `max = 0, top = []
while(Table 1 has more rows) {
  Read the first row X from Table 1
  if (X.Total > max) {
    max = X.Total
    top = [X.CardNo, max]
  }
  Move X to Table 2
}

main()

Procedure main()
A = 1, D = 5
B = 34
C = A *  B * 2
L1 = [1,2,3,4], L2 = [], L3 = []
foreach element in L1 {
  L2 = L2 ++ [element]
  L2 = [element] ++ L2 
}
End main

`;

// predefined functions

function first(L) {
  return L[0];
}

function last(L) {
  return L[L.length - 1];
}

function init(L) {
  return L.slice(0, -1);
}

function rest(L) {
  return L.slice(1);
}

function keys(obj) {
  return Object.keys(obj);
}

function length(L) {
  return L.length;
}

function getTable(table) {
  switch (table) {
    case "scores":
      return JSON.stringify(datasets.scores);
    case "words":
      return JSON.stringify(datasets.words);
    case "shoppingbill":
      return JSON.stringify(datasets.shoppingbill);
    case "empty":
      return JSON.stringify([]);
  }
}

function evaluateCode() {
  console.clear();

  let editor = document.getElementById("code-editor");
  let jsCode = document.getElementById("js-code");
  let output = document.getElementById("code-output");
  let variables = document.getElementsByClassName("variable");
  let tables = document.getElementsByClassName("ds-table");

  output.value = "";
  jsCode.value = editor.value;

  for (let t = 0; t < tables.length; t++) {
    eval(`Table_${t + 1} = JSON.parse(getTable(tables[t].value))`);
  }

  LIST_CONCATENATION = /(\w+)\s*=\s*(\S+)\s*\+\+\s*(\S+)/;
  FOREACH_DEFINITION = /foreach\s*(\S+)\s+in\s+(\w+)/i;
  FUNCTION_BLOCK_START = /Procedure\s+(\w+)\((.*)\)/;
  FUNCTION_BLOCK_END = /End\s+(\w+)/;
  WHILE_CONDITION = /while\s*\((Table\s*1)\s+has\s+more\s+rows\s*\)/;
  READ_ONE_ROW = /Read\s+the\s+first\s+row\s+(\S)\s+from\s+(.+)/;
  MOVE_ONE_ROW = /Move\s+(\S)\s+to\s+(\S+ \S)/;

  // parsing foreach definition
  while (jsCode.value.match(FOREACH_DEFINITION)) {
    let matched = jsCode.value.match(FOREACH_DEFINITION);
    jsCode.value = jsCode.value.replace(
      FOREACH_DEFINITION,
      `for (${matched[1]} of ${matched[2]})`
    );
  }

  // parsing while condition
  while (jsCode.value.match(WHILE_CONDITION)) {
    let matched = jsCode.value.match(WHILE_CONDITION);
    jsCode.value = jsCode.value.replace(
      WHILE_CONDITION,
      `while (${matched[1].replace(" ", "_")}.length > 0) `
    );
  }

  // reading one card to from table
  while (jsCode.value.match(READ_ONE_ROW)) {
    let matched = jsCode.value.match(READ_ONE_ROW);
    jsCode.value = jsCode.value.replace(
      READ_ONE_ROW,
      `${matched[1]} = ${matched[2].replace(" ", "_")}.shift()`
    );
  }

  // moving one card to another table
  while (jsCode.value.match(MOVE_ONE_ROW)) {
    let matched = jsCode.value.match(MOVE_ONE_ROW);
    jsCode.value = jsCode.value.replace(
      MOVE_ONE_ROW,
      `${matched[2].replace(" ", "_")}.push(${matched[1]})`
    );
  }

  // parsing list contactenation
  while (jsCode.value.match(LIST_CONCATENATION)) {
    let matched = jsCode.value.match(LIST_CONCATENATION);
    jsCode.value = jsCode.value.replace(
      LIST_CONCATENATION,
      matched[1] == matched[2]
        ? `${matched[1]} = ${matched[1]}.concat(${matched[3]})`
        : `${matched[1]} = ${matched[2]}.concat(${matched[1]})`
    );
  }

  // function block
  while (jsCode.value.match(FUNCTION_BLOCK_START)) {
    let matched = jsCode.value.match(FUNCTION_BLOCK_START);
    jsCode.value = jsCode.value.replace(
      FUNCTION_BLOCK_START,
      `function ${matched[1]}(${matched[2]}) {`
    );
  }

  while (jsCode.value.match(FUNCTION_BLOCK_END)) {
    let matched = jsCode.value.match(FUNCTION_BLOCK_END);
    jsCode.value = jsCode.value.replace(FUNCTION_BLOCK_END, `}`);
  }

  try {
    // console.log(jsCode.value)
    eval(jsCode.value);
  } catch (error) {
    output.value += error.message + "\n";
    console.error(error);
  }

  for (let variable of variables) {
    try {
      // console.log(
      //   variable.value.toString(),
      //   Object.prototype.toString.call(this[variable.value])
      // );
      switch (Object.prototype.toString.call(this[variable.value])) {
        case "[object Array]":
          output.value +=
            `${variable.value}:    ${JSON.stringify(this[variable.value])}` +
            "\n\n";
          break;
        case "[object Number]":
          output.value +=
            `${variable.value}:    ${this[variable.value]}` + "\n\n";
          break;
        default:
          if (/Table/.test(variable.value)) {
            variable.value = variable.value.replace(" ", "_");
            output.value += `${variable.value}:` + "\n";
            if (this[variable.value].length != 0) {
              for (let key of Object.keys(this[variable.value][0])) {
                output.value += key + ",";
              }
              output.value += "\n";
              for (let row of this[variable.value]) {
                for (let key of Object.keys(this[variable.value][0])) {
                  output.value += row[key] + ",";
                }
                output.value += "\n";
              }
            } else {
              output.value += "Empty Table\n\n";
            }
          } else {
            output.value +=
              `${variable.value}:   ${this[variable.value]}` + "\n\n";
          }
      }
    } catch (error) {
      output.value += `${variable.value}:   ` + error.message + "\n\n";
      console.log(error);
    }
  }
}

// evaluateCode();