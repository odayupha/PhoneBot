# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.




### React
For each operation, there is a wrapper hook that can be used to call the operation.

Here are all of the hooks that get generated:
```ts
import { useListAllMovies, useGetMyMovieLists, useCreateMyMovieList, useAddMovieToMyList } from '@dataconnect/generated/react';
// The types of these hooks are available in react/index.d.ts

const { data, isPending, isSuccess, isError, error } = useListAllMovies();

const { data, isPending, isSuccess, isError, error } = useGetMyMovieLists();

const { data, isPending, isSuccess, isError, error } = useCreateMyMovieList(createMyMovieListVars);

const { data, isPending, isSuccess, isError, error } = useAddMovieToMyList(addMovieToMyListVars);

```

Here's an example from a different generated SDK:

```ts
import { useListAllMovies } from '@dataconnect/generated/react';

function MyComponent() {
  const { isLoading, data, error } = useListAllMovies();
  if(isLoading) {
    return <div>Loading...</div>
  }
  if(error) {
    return <div> An Error Occurred: {error} </div>
  }
}

// App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MyComponent from './my-component';

function App() {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>
    <MyComponent />
  </QueryClientProvider>
}
```



## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { listAllMovies, getMyMovieLists, createMyMovieList, addMovieToMyList } from '@dataconnect/generated';


// Operation ListAllMovies: 
const { data } = await ListAllMovies(dataConnect);

// Operation GetMyMovieLists: 
const { data } = await GetMyMovieLists(dataConnect);

// Operation CreateMyMovieList:  For variables, look at type CreateMyMovieListVars in ../index.d.ts
const { data } = await CreateMyMovieList(dataConnect, createMyMovieListVars);

// Operation AddMovieToMyList:  For variables, look at type AddMovieToMyListVars in ../index.d.ts
const { data } = await AddMovieToMyList(dataConnect, addMovieToMyListVars);


```