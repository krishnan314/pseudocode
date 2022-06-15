// regex and replacement for the statements used
const TRANSLATION = {
  LIST_CONCATENATION_1: {
    PATTERN: /(\w+)\s*=\s*\1\s*\+\+\s*(\S+)/,
    REPLACEMENT: "{{1}} = {{1}}.concat({{2}})",
  },
  LIST_CONCATENATION_2: {
    PATTERN: /(\w+)\s*=\s*(\S+)\s*\+\+\s*\1/,
    REPLACEMENT: "{{1}} = {{2}}.concat({{1}})",
  },
  FOREACH_DEFINITION: {
    PATTERN: /foreach\s*(\S+)\s+in\s+(\w+)/i,
    REPLACEMENT: "for ({{1}} of {{2}})",
  },
  FUNCTION_BLOCK_START: {
    PATTERN: /Procedure\s+(\w+)\((.*)\)/,
    REPLACEMENT: "function {{1}}({{2}}) {",
  },
  FUNCTION_BLOCK_END: { PATTERN: /End\s+(\w+)/, REPLACEMENT: "}" },
  WHILE_CONDITION: {
    PATTERN: /while\s*\((Table\s*\w+)\s+has\s+more\s+rows\s*\)/,
    REPLACEMENT: "while (this['{{1}}'.replace(' ', '_')].length > 0) ",
  },
  READ_ONE_ROW: {
    PATTERN: /Read\s+the\s+first\s+row\s+(\S)\s+from\s+(.+)/,
    REPLACEMENT: "{{1}} = this['{{2}}'.replace(' ', '_')].shift()",
  },
  MOVE_ONE_ROW: {
    PATTERN: /Move\s+(row\s+)?(\S)\s+to\s+(\S+ \S)/,
    REPLACEMENT: "this['{{3}}'.replace(' ', '_')].push({{2}})",
  },
  ITH_LETTER_OF_WORD: {
    PATTERN: /(\w+)th letter of ([\w.]+)/,
    REPLACEMENT: "{{2}}[{{1}}-1]",
  },
  NEGATION: {
    PATTERN: /\bnot\b/,
    REPLACEMENT: "!",
  },
  PARSE_TRUE: {
    PATTERN: /\bTrue\b/,
    REPLACEMENT: "true",
  },
  ENDS_WITH_FULL_STOP: {
    PATTERN: /\b([\w.]+)\s+ends\s+with\s+a\s+full\s+stop/,
    REPLACEMENT: "{{1}}[{{1}}.length - 1] == '.'",
  },
};

// retrieval of buffer values
function loadBuffer() {
  let editor = document.getElementById("code-editor");
  let variables = document.getElementsByClassName("variable");

  if (localStorage["code-editor-value"]) {
    editor.value = localStorage["code-editor-value"];
  } else {
    editor.value = `max = 0, top = []
while(Table 1 has more rows) {
  Read the first row X from Table 1
  if (X.Total > max) {
    max = X.Total
    topper = [X.CardNo, max]
  }
  Move X to Table 2
}

main()

Procedure main()
A = 1, D = 5
B = 34
C = A * B * 2
L1 = [1,2,3,4], L2 = [], L3 = []
foreach element in L1 {
  L2 = L2 ++ [element]
  L2 = [element] ++ L2 
}
End main`;
  }
  let bufferVariables = localStorage["variable-box-values"].split(",");
  if (bufferVariables) {
    for (let i in bufferVariables) {
      try {
        variables[i].value = bufferVariables[i];
      } catch (error) {
        continue;
      }
    }
  }
}

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

function isKey(collection, obj) {
  return obj in collection;
}

function length(L) {
  return L.length;
}

function getTable(table) {
  switch (table) {
    case "scores":
      return JSON.parse(JSON.stringify(datasets.scores));
    case "words":
      return JSON.parse(JSON.stringify(datasets.words));
    case "shoppingbill":
      return JSON.parse(JSON.stringify(datasets.shoppingbill));
    case "empty":
      return JSON.parse(JSON.stringify([]));
  }
}

function stroutVariable(variable) {
  let strout = "";
  try {
    const variableName = /^(Table|Pile)/.test(variable.value)
      ? variable.value.replace(" ", "_")
      : variable.value;

    switch (Object.prototype.toString.call(this[variableName])) {
      case "[object Array]":
        if (/^Table/.test(variableName)) {
          strout += `${variableName}:\n`;
          if (this[variableName].length != 0) {
            strout += Object.keys(this[variableName][0]).join() + "\n";
            for (let row of this[variableName]) {
              strout += Object.values(row).join() + "\n";
            }
          } else {
            strout += "Empty Table\n\n";
          }
        } else {
          strout +=
            `${variableName}:    ${JSON.stringify(this[variableName])}` +
            "\n\n";
        }
        break;
      case "[object Number]":
        strout += `${variableName}:    ${this[variableName]}\n\n`;
        break;
      case "[object Object]":
        strout += `${variableName}:    ${JSON.stringify(
          this[variableName],
          null,
          2
        )}\n\n`;
        break;
      default:
        let variableSplit = variableName
          .split(/(\.|\[|\])/)
          .filter((x) => !/[\.\[\]]/.test(x))
          .filter((x) => x != "")
          .map((x) => x.split('"').join("").split("'").join(""));
        const variableNameBase = variableSplit[0];
        let variableNameRest = variableSplit.slice(1);
        // console.log(variableSplit);

        const getVariableWithSub = (f, val, levels) => {
          if (levels.length == 0) {
            return val;
          }
          if (levels.length == 1) {
            return val[levels[0]];
          }

          return f(f, val[levels[0]], levels.slice(1));
        };

        strout += `${variableName}:   ${JSON.stringify(
          getVariableWithSub(
            getVariableWithSub,
            this[variableNameBase],
            variableNameRest
          ),
          null,
          2
        )}\n\n`;
    }
  } catch (error) {
    strout += `${variable.value}:   ${error.message}\n\n`;
    console.log(error);
  }
  return strout;
}

// parse the CT specific to equivalent js
function translate() {
  let jsCode = document.getElementById("js-code");
  for (let t in TRANSLATION) {
    let count = 0;
    while (jsCode.value.match(TRANSLATION[t].PATTERN)) {
      count++;
      if (count > 10000) {
        console.log(`break ucount:${count}`);
        break;
      }
      let matched = jsCode.value.match(TRANSLATION[t].PATTERN);
      let translated = TRANSLATION[t].REPLACEMENT;
      for (i = 1; i <= matched.length; i++) {
        try {
          translated = translated.split("{{" + i + "}}").join(matched[i]);
        } catch (error) {
          console.log(error);
        }
      }
      jsCode.value = jsCode.value.replace(TRANSLATION[t].PATTERN, translated);
    }
  }
}

function evaluateCode() {
  // console.clear();

  // getting the DOM elements
  let editor = document.getElementById("code-editor");
  let jsCode = document.getElementById("js-code");
  let output = document.getElementById("code-output");
  let variables = document.getElementsByClassName("variable");
  let tables = document.getElementsByClassName("ds-table");

  // setting default values
  output.value = "";
  jsCode.value = editor.value;

  // setting localstorage values
  localStorage["code-editor-value"] = editor.value;
  localStorage["variable-box-values"] = Array.from(variables).map(
    (variable) => {
      return variable.value;
    }
  );

  // setting localstorage values if it is not empty otherwise default
  loadBuffer();

  // assign the selected dataset to the table variables
  for (let t = 0; t < tables.length; t++) {
    this[`Table_${t + 1}`] = getTable(tables[t].value);
  }

  translate(TRANSLATION);

  try {
    // console.log(jsCode.value);
    eval(jsCode.value);
  } catch (error) {
    output.value += error.stack + "\n\n";
    console.error(error.stack);
  }

  for (let variable of variables) {
    output.value += stroutVariable(variable);
  }
}

loadBuffer();

// try {
//   console.clear();
//   evaluateCode();
// } catch (error) {
//   let output = document.getElementById("code-output");
//   output.value = error.stack;
// }
