import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions, MutationRef, MutationPromise, DataConnectSettings } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;
export const dataConnectSettings: DataConnectSettings;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface AddMovieToMyListData {
  movieListItem_insert: MovieListItem_Key;
}

export interface AddMovieToMyListVariables {
  movieListId: UUIDString;
  movieId: UUIDString;
  position: number;
  note?: string | null;
}

export interface CreateMyMovieListData {
  movieList_insert: MovieList_Key;
}

export interface CreateMyMovieListVariables {
  name: string;
  isPublic: boolean;
  description?: string | null;
}

export interface GetMyMovieListsData {
  movieLists: ({
    id: UUIDString;
    name: string;
    isPublic: boolean;
    createdAt: TimestampString;
    updatedAt: TimestampString;
    description?: string | null;
    movieListItems_on_movieList: ({
      position: number;
      note?: string | null;
      movie: {
        title: string;
        releaseYear: number;
      };
    })[];
  } & MovieList_Key)[];
}

export interface ListAllMoviesData {
  movies: ({
    id: UUIDString;
    title: string;
    releaseYear: number;
    genres?: string[] | null;
    summary?: string | null;
  } & Movie_Key)[];
}

export interface MovieListItem_Key {
  id: UUIDString;
  __typename?: 'MovieListItem_Key';
}

export interface MovieList_Key {
  id: UUIDString;
  __typename?: 'MovieList_Key';
}

export interface Movie_Key {
  id: UUIDString;
  __typename?: 'Movie_Key';
}

export interface Review_Key {
  id: UUIDString;
  __typename?: 'Review_Key';
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

export interface Watch_Key {
  id: UUIDString;
  __typename?: 'Watch_Key';
}

interface ListAllMoviesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListAllMoviesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListAllMoviesData, undefined>;
  operationName: string;
}
export const listAllMoviesRef: ListAllMoviesRef;

export function listAllMovies(options?: ExecuteQueryOptions): QueryPromise<ListAllMoviesData, undefined>;
export function listAllMovies(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListAllMoviesData, undefined>;

interface GetMyMovieListsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetMyMovieListsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetMyMovieListsData, undefined>;
  operationName: string;
}
export const getMyMovieListsRef: GetMyMovieListsRef;

export function getMyMovieLists(options?: ExecuteQueryOptions): QueryPromise<GetMyMovieListsData, undefined>;
export function getMyMovieLists(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetMyMovieListsData, undefined>;

interface CreateMyMovieListRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateMyMovieListVariables): MutationRef<CreateMyMovieListData, CreateMyMovieListVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateMyMovieListVariables): MutationRef<CreateMyMovieListData, CreateMyMovieListVariables>;
  operationName: string;
}
export const createMyMovieListRef: CreateMyMovieListRef;

export function createMyMovieList(vars: CreateMyMovieListVariables): MutationPromise<CreateMyMovieListData, CreateMyMovieListVariables>;
export function createMyMovieList(dc: DataConnect, vars: CreateMyMovieListVariables): MutationPromise<CreateMyMovieListData, CreateMyMovieListVariables>;

interface AddMovieToMyListRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AddMovieToMyListVariables): MutationRef<AddMovieToMyListData, AddMovieToMyListVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AddMovieToMyListVariables): MutationRef<AddMovieToMyListData, AddMovieToMyListVariables>;
  operationName: string;
}
export const addMovieToMyListRef: AddMovieToMyListRef;

export function addMovieToMyList(vars: AddMovieToMyListVariables): MutationPromise<AddMovieToMyListData, AddMovieToMyListVariables>;
export function addMovieToMyList(dc: DataConnect, vars: AddMovieToMyListVariables): MutationPromise<AddMovieToMyListData, AddMovieToMyListVariables>;

