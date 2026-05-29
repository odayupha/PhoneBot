import { queryRef, executeQuery, validateArgsWithOptions, mutationRef, executeMutation, validateArgs, makeMemoryCacheProvider } from 'firebase/data-connect';

export const connectorConfig = {
  connector: 'example',
  service: 'tugasbesar',
  location: 'us-east4'
};
export const dataConnectSettings = {
  cacheSettings: {
    cacheProvider: makeMemoryCacheProvider()
  }
};
export const listAllMoviesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListAllMovies');
}
listAllMoviesRef.operationName = 'ListAllMovies';

export function listAllMovies(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listAllMoviesRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}

export const getMyMovieListsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMyMovieLists');
}
getMyMovieListsRef.operationName = 'GetMyMovieLists';

export function getMyMovieLists(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(getMyMovieListsRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}

export const createMyMovieListRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateMyMovieList', inputVars);
}
createMyMovieListRef.operationName = 'CreateMyMovieList';

export function createMyMovieList(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createMyMovieListRef(dcInstance, inputVars));
}

export const addMovieToMyListRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AddMovieToMyList', inputVars);
}
addMovieToMyListRef.operationName = 'AddMovieToMyList';

export function addMovieToMyList(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(addMovieToMyListRef(dcInstance, inputVars));
}

