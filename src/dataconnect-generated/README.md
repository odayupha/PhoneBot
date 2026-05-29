# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect-generated/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*ListAllMovies*](#listallmovies)
  - [*GetMyMovieLists*](#getmymovielists)
- [**Mutations**](#mutations)
  - [*CreateMyMovieList*](#createmymovielist)
  - [*AddMovieToMyList*](#addmovietomylist)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## ListAllMovies
You can execute the `ListAllMovies` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listAllMovies(options?: ExecuteQueryOptions): QueryPromise<ListAllMoviesData, undefined>;

interface ListAllMoviesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListAllMoviesData, undefined>;
}
export const listAllMoviesRef: ListAllMoviesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listAllMovies(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListAllMoviesData, undefined>;

interface ListAllMoviesRef {
  ...
  (dc: DataConnect): QueryRef<ListAllMoviesData, undefined>;
}
export const listAllMoviesRef: ListAllMoviesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listAllMoviesRef:
```typescript
const name = listAllMoviesRef.operationName;
console.log(name);
```

### Variables
The `ListAllMovies` query has no variables.
### Return Type
Recall that executing the `ListAllMovies` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListAllMoviesData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListAllMoviesData {
  movies: ({
    id: UUIDString;
    title: string;
    releaseYear: number;
    genres?: string[] | null;
    summary?: string | null;
  } & Movie_Key)[];
}
```
### Using `ListAllMovies`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listAllMovies } from '@dataconnect/generated';


// Call the `listAllMovies()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listAllMovies();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listAllMovies(dataConnect);

console.log(data.movies);

// Or, you can use the `Promise` API.
listAllMovies().then((response) => {
  const data = response.data;
  console.log(data.movies);
});
```

### Using `ListAllMovies`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listAllMoviesRef } from '@dataconnect/generated';


// Call the `listAllMoviesRef()` function to get a reference to the query.
const ref = listAllMoviesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listAllMoviesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.movies);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.movies);
});
```

## GetMyMovieLists
You can execute the `GetMyMovieLists` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getMyMovieLists(options?: ExecuteQueryOptions): QueryPromise<GetMyMovieListsData, undefined>;

interface GetMyMovieListsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetMyMovieListsData, undefined>;
}
export const getMyMovieListsRef: GetMyMovieListsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getMyMovieLists(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetMyMovieListsData, undefined>;

interface GetMyMovieListsRef {
  ...
  (dc: DataConnect): QueryRef<GetMyMovieListsData, undefined>;
}
export const getMyMovieListsRef: GetMyMovieListsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getMyMovieListsRef:
```typescript
const name = getMyMovieListsRef.operationName;
console.log(name);
```

### Variables
The `GetMyMovieLists` query has no variables.
### Return Type
Recall that executing the `GetMyMovieLists` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetMyMovieListsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `GetMyMovieLists`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getMyMovieLists } from '@dataconnect/generated';


// Call the `getMyMovieLists()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getMyMovieLists();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getMyMovieLists(dataConnect);

console.log(data.movieLists);

// Or, you can use the `Promise` API.
getMyMovieLists().then((response) => {
  const data = response.data;
  console.log(data.movieLists);
});
```

### Using `GetMyMovieLists`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getMyMovieListsRef } from '@dataconnect/generated';


// Call the `getMyMovieListsRef()` function to get a reference to the query.
const ref = getMyMovieListsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getMyMovieListsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.movieLists);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.movieLists);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateMyMovieList
You can execute the `CreateMyMovieList` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createMyMovieList(vars: CreateMyMovieListVariables): MutationPromise<CreateMyMovieListData, CreateMyMovieListVariables>;

interface CreateMyMovieListRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateMyMovieListVariables): MutationRef<CreateMyMovieListData, CreateMyMovieListVariables>;
}
export const createMyMovieListRef: CreateMyMovieListRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createMyMovieList(dc: DataConnect, vars: CreateMyMovieListVariables): MutationPromise<CreateMyMovieListData, CreateMyMovieListVariables>;

interface CreateMyMovieListRef {
  ...
  (dc: DataConnect, vars: CreateMyMovieListVariables): MutationRef<CreateMyMovieListData, CreateMyMovieListVariables>;
}
export const createMyMovieListRef: CreateMyMovieListRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createMyMovieListRef:
```typescript
const name = createMyMovieListRef.operationName;
console.log(name);
```

### Variables
The `CreateMyMovieList` mutation requires an argument of type `CreateMyMovieListVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateMyMovieListVariables {
  name: string;
  isPublic: boolean;
  description?: string | null;
}
```
### Return Type
Recall that executing the `CreateMyMovieList` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateMyMovieListData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateMyMovieListData {
  movieList_insert: MovieList_Key;
}
```
### Using `CreateMyMovieList`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createMyMovieList, CreateMyMovieListVariables } from '@dataconnect/generated';

// The `CreateMyMovieList` mutation requires an argument of type `CreateMyMovieListVariables`:
const createMyMovieListVars: CreateMyMovieListVariables = {
  name: ..., 
  isPublic: ..., 
  description: ..., // optional
};

// Call the `createMyMovieList()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createMyMovieList(createMyMovieListVars);
// Variables can be defined inline as well.
const { data } = await createMyMovieList({ name: ..., isPublic: ..., description: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createMyMovieList(dataConnect, createMyMovieListVars);

console.log(data.movieList_insert);

// Or, you can use the `Promise` API.
createMyMovieList(createMyMovieListVars).then((response) => {
  const data = response.data;
  console.log(data.movieList_insert);
});
```

### Using `CreateMyMovieList`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createMyMovieListRef, CreateMyMovieListVariables } from '@dataconnect/generated';

// The `CreateMyMovieList` mutation requires an argument of type `CreateMyMovieListVariables`:
const createMyMovieListVars: CreateMyMovieListVariables = {
  name: ..., 
  isPublic: ..., 
  description: ..., // optional
};

// Call the `createMyMovieListRef()` function to get a reference to the mutation.
const ref = createMyMovieListRef(createMyMovieListVars);
// Variables can be defined inline as well.
const ref = createMyMovieListRef({ name: ..., isPublic: ..., description: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createMyMovieListRef(dataConnect, createMyMovieListVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.movieList_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.movieList_insert);
});
```

## AddMovieToMyList
You can execute the `AddMovieToMyList` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
addMovieToMyList(vars: AddMovieToMyListVariables): MutationPromise<AddMovieToMyListData, AddMovieToMyListVariables>;

interface AddMovieToMyListRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AddMovieToMyListVariables): MutationRef<AddMovieToMyListData, AddMovieToMyListVariables>;
}
export const addMovieToMyListRef: AddMovieToMyListRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
addMovieToMyList(dc: DataConnect, vars: AddMovieToMyListVariables): MutationPromise<AddMovieToMyListData, AddMovieToMyListVariables>;

interface AddMovieToMyListRef {
  ...
  (dc: DataConnect, vars: AddMovieToMyListVariables): MutationRef<AddMovieToMyListData, AddMovieToMyListVariables>;
}
export const addMovieToMyListRef: AddMovieToMyListRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the addMovieToMyListRef:
```typescript
const name = addMovieToMyListRef.operationName;
console.log(name);
```

### Variables
The `AddMovieToMyList` mutation requires an argument of type `AddMovieToMyListVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AddMovieToMyListVariables {
  movieListId: UUIDString;
  movieId: UUIDString;
  position: number;
  note?: string | null;
}
```
### Return Type
Recall that executing the `AddMovieToMyList` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AddMovieToMyListData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AddMovieToMyListData {
  movieListItem_insert: MovieListItem_Key;
}
```
### Using `AddMovieToMyList`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, addMovieToMyList, AddMovieToMyListVariables } from '@dataconnect/generated';

// The `AddMovieToMyList` mutation requires an argument of type `AddMovieToMyListVariables`:
const addMovieToMyListVars: AddMovieToMyListVariables = {
  movieListId: ..., 
  movieId: ..., 
  position: ..., 
  note: ..., // optional
};

// Call the `addMovieToMyList()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await addMovieToMyList(addMovieToMyListVars);
// Variables can be defined inline as well.
const { data } = await addMovieToMyList({ movieListId: ..., movieId: ..., position: ..., note: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await addMovieToMyList(dataConnect, addMovieToMyListVars);

console.log(data.movieListItem_insert);

// Or, you can use the `Promise` API.
addMovieToMyList(addMovieToMyListVars).then((response) => {
  const data = response.data;
  console.log(data.movieListItem_insert);
});
```

### Using `AddMovieToMyList`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, addMovieToMyListRef, AddMovieToMyListVariables } from '@dataconnect/generated';

// The `AddMovieToMyList` mutation requires an argument of type `AddMovieToMyListVariables`:
const addMovieToMyListVars: AddMovieToMyListVariables = {
  movieListId: ..., 
  movieId: ..., 
  position: ..., 
  note: ..., // optional
};

// Call the `addMovieToMyListRef()` function to get a reference to the mutation.
const ref = addMovieToMyListRef(addMovieToMyListVars);
// Variables can be defined inline as well.
const ref = addMovieToMyListRef({ movieListId: ..., movieId: ..., position: ..., note: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = addMovieToMyListRef(dataConnect, addMovieToMyListVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.movieListItem_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.movieListItem_insert);
});
```

