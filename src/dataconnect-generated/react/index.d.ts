import { ListAllMoviesData, GetMyMovieListsData, CreateMyMovieListData, CreateMyMovieListVariables, AddMovieToMyListData, AddMovieToMyListVariables } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useListAllMovies(options?: useDataConnectQueryOptions<ListAllMoviesData>): UseDataConnectQueryResult<ListAllMoviesData, undefined>;
export function useListAllMovies(dc: DataConnect, options?: useDataConnectQueryOptions<ListAllMoviesData>): UseDataConnectQueryResult<ListAllMoviesData, undefined>;

export function useGetMyMovieLists(options?: useDataConnectQueryOptions<GetMyMovieListsData>): UseDataConnectQueryResult<GetMyMovieListsData, undefined>;
export function useGetMyMovieLists(dc: DataConnect, options?: useDataConnectQueryOptions<GetMyMovieListsData>): UseDataConnectQueryResult<GetMyMovieListsData, undefined>;

export function useCreateMyMovieList(options?: useDataConnectMutationOptions<CreateMyMovieListData, FirebaseError, CreateMyMovieListVariables>): UseDataConnectMutationResult<CreateMyMovieListData, CreateMyMovieListVariables>;
export function useCreateMyMovieList(dc: DataConnect, options?: useDataConnectMutationOptions<CreateMyMovieListData, FirebaseError, CreateMyMovieListVariables>): UseDataConnectMutationResult<CreateMyMovieListData, CreateMyMovieListVariables>;

export function useAddMovieToMyList(options?: useDataConnectMutationOptions<AddMovieToMyListData, FirebaseError, AddMovieToMyListVariables>): UseDataConnectMutationResult<AddMovieToMyListData, AddMovieToMyListVariables>;
export function useAddMovieToMyList(dc: DataConnect, options?: useDataConnectMutationOptions<AddMovieToMyListData, FirebaseError, AddMovieToMyListVariables>): UseDataConnectMutationResult<AddMovieToMyListData, AddMovieToMyListVariables>;
