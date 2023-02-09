# Directus2Ts

Forked from: https://github.com/elierotenberg/directus-typescript-gen

## Instalação

```js
  npm i @devix/directus2ts
```

## Uso

```bash
tsx directus2ts --host <directus-host> --token <auth-token> --typeName <nome-type> --outFile <nome-arquivo.d.ts> --simplified
```

<small>A opção simplified gera um arquivo menor sem muita poluição. Serve para maioria dos usos.</small>

## Instanciando no Directus SDK

```ts
import { Directus } from "@directus/sdk";
import { MyCollections } from "./my-collections.d.ts";

const directus = new Directus<MyCollections>();
```
