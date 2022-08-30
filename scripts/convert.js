const fs = require('fs')
const path = require('path')
const { parse } = require('@babel/parser')
const traverse = require('@babel/traverse').default
const babel = require('@babel/core')

const entryPath = 'src/js/index.js'
let ID = 0

const getDependencies = (filePath) => {
  const fileContent = fs.readFileSync(filePath, { encoding: 'utf-8' })
  const ast = parse(fileContent, { sourceType: 'module' })

  if (ast.errors.length > 0) {
    throw new Error(ast.errors[0].reasonCode)
  }

  const dependencies = []

  traverse(ast, {
    ImportDeclaration({ node }) {
      const pathValue = node.source.value

      dependencies.push(pathValue)
    }
  })

  const { code } = babel.transformFromAstSync(ast, null, { presets: ['@babel/preset-env'] })

  return {
    id: ID++,
    filePath,
    dependencies,
    code,
  }
}

const getGraph = (filePath) => {
  const asset = getDependencies(filePath)

  const queue = [asset]
  let index = 0

  while(index < queue.length) {
    const item = queue[index++]

    item.mapping = {}

    item.dependencies.forEach(relativePath => {
      const filePathWithDirName = path.join(path.dirname(item.filePath), relativePath)

      const childAsset = getDependencies(filePathWithDirName)

      item.mapping[relativePath] = childAsset.id

      queue.push(childAsset)
    })
  }

  return queue
}


const graph = getGraph(entryPath)

const bundleCode = () => {
  let modules = ''

  graph.forEach(({ id, code, mapping }) => {
    modules += `${id}: [function(require, exports) { ${code} }, ${JSON.stringify(mapping)}],`
  })

  modules = `{ ${modules} }`

  return `((modules)=> {
    function require(id) {
      const [fn, mapping] = modules[id]

      const exports = {}

      function requireFunc(modulePath) {
        const id = mapping[modulePath]
        return require(id)
      }

      fn(requireFunc, exports)

      return exports
    }
    require(0)
  })(${modules})`
}

const ret = bundleCode()

fs.writeFileSync('./dist/bundle.js', ret)

console.log('代码转换完成，已写入 ./dist/bundle.js 文件')
