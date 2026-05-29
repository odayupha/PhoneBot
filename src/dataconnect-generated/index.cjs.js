const { queryRef, executeQuery, validateArgsWithOptions, mutationRef, executeMutation, validateArgs, makeMemoryCacheProvider } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'example',
  service: 'tugasbesar',
  location: 'us-east4'
};
exports.connectorConfig = connectorConfig;
const dataConnectSettings = {
  cacheSettings: {
    cacheProvider: makeMemoryCacheProvider()
  }
};
exports.dataConnectSettings = dataConnectSettings;

const listAllMoviesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListAllMovies');
}
listAllMoviesRef.operationName = 'ListAllMovies';
exports.listAllMoviesRef = listAllMoviesRef;

exports.listAllMovies = function listAllMovies(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listAllMoviesRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}
;

const getMyMovieListsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMyMovieLists');
}
getMyMovieListsRef.operationName = 'GetMyMovieLists';
exports.getMyMovieListsRef = getMyMovieListsRef;

exports.getMyMovieLists = function getMyMovieLists(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(getMyMovieListsRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}
;

const createMyMovieListRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateMyMovieList', inputVars);
}
createMyMovieListRef.operationName = 'CreateMyMovieList';
exports.createMyMovieListRef = createMyMovieListRef;

exports.createMyMovieList = function createMyMovieList(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createMyMovieListRef(dcInstance, inputVars));
}
;

const addMovieToMyListRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AddMovieToMyList', inputVars);
}
addMovieToMyListRef.operationName = 'AddMovieToMyList';
exports.addMovieToMyListRef = addMovieToMyListRef;

exports.addMovieToMyList = function addMovieToMyList(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(addMovieToMyListRef(dcInstance, inputVars));
}
;
