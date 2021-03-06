const { customGet, post } = require('../lib/request')
const errors_ = require('../lib/errors')
const { grey } = require('chalk')
const program = require('../lib/program')
const output = require('../lib/output')(program)
const { simplify } = require('wikibase-sdk')

const simplifyOption = !program.raw
const { index: indexAttribute } = program

module.exports = sparql => {
  // JIT require to be sure program.process was already called
  // and program.sparqlEndpoint is set
  require('../lib/exit_on_missing').sparqlEndpoint(program.sparqlEndpoint)
  const { sparqlQuery } = require('../lib/wbk')(program)

  const url = sparqlQuery(sparql)
  return makeRequest(url)
  .then(parseResult)
  .catch(errors_.exit)
}

const headers = {
  Accept: 'application/sparql-results+json'
}

const makeRequest = url => {
  // Avoid making a POST request when not necessary as those aren't cached
  // see https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual#SPARQL_endpoint
  if (url.length < 5000) {
    output(`${grey('Generated get query:')} ${url}`, true, true)
    return customGet({ url, headers })
  } else {
    const [ postUrl, body ] = url.split('?')
    output(`${grey('Generated post body:')} ${body}`, true, true)
    return post({ url: postUrl, body, headers })
  }
}

const parseResult = results => {
  if (simplifyOption) {
    results = simplify.sparqlResults(results, { minimize: true })
    if (indexAttribute) results = indexBy(results, indexAttribute)
  }
  return results
}

const indexBy = (array, attribute) => {
  const index = {}
  array.forEach(obj => {
    let key = obj[attribute]
    delete obj[attribute]
    if (typeof key === 'object' && key.value) key = key.value
    // Not setting the obj as direct value, as several obj might share the same key
    if (!index[key]) index[key] = [ obj ]
    else index[key].push(obj)
  })
  return index
}
