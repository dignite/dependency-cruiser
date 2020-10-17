const walk = require("acorn-walk");
const estreeHelpers = require("./estree-helpers");

function pryStringsFromArguments(pArguments) {
  let lReturnValue = [];

  if (estreeHelpers.firstArgumentIsAString(pArguments)) {
    lReturnValue = pArguments[0].value.split("!");
  } else if (estreeHelpers.firstArgumentIsATemplateLiteral(pArguments)) {
    lReturnValue = [pArguments[0].quasis[0].value.cooked];
  }

  return lReturnValue;
}

function pushRequireCallsToDependencies(
  pDependencies,
  pModuleSystem,
  pExoticRequireStrings
) {
  return (pNode) => {
    for (let lName of ["require"].concat(pExoticRequireStrings)) {
      if (estreeHelpers.isRequireOfSomeSort(pNode, lName)) {
        for (let lString of pryStringsFromArguments(pNode.arguments)) {
          pDependencies.push({
            module: lString,
            moduleSystem: pModuleSystem,
            dynamic: false,
            ...(lName === "require"
              ? { exoticallyRequired: false }
              : { exoticallyRequired: true, exoticRequire: lName }),
          });
        }
      }
    }
  };
}

module.exports = (
  pAST,
  pDependencies,
  pModuleSystem,
  pExoticRequireStrings
) => {
  // var/const lalala = require('./lalala');
  // require('./lalala');
  // require('./lalala').doFunkyStuff();
  // require('zoinks!./wappie')
  // require(`./withatemplateliteral`)
  // as well as renamed requires/ require wrappers
  // as passed in pExoticRequireStrings ("need", "window.require")
  walk.simple(
    pAST,
    {
      CallExpression: pushRequireCallsToDependencies(
        pDependencies,
        pModuleSystem,
        pExoticRequireStrings
      ),
    },
    // see https://github.com/acornjs/acorn/issues/746
    walk.base
  );
};
