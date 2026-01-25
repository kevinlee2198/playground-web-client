# JSON-to-GraphQL-Query Usage Examples

> Reference for: json-to-graphql-query-guidelines

## Usage

```
const query = jsonToGraphQLQuery(queryObject: object, options?: object);
```

Supported Options:

- pretty - boolean - optional - set to true to enable pretty-printed output
- ignoreFields - string[] - optional - you can pass an array of object key names that you want removed from the query
- includeFalsyKeys - boolean - optional - disable the default behaviour if excluding keys with a falsy value

### Simple Query

Code:

```
import { jsonToGraphQLQuery } from 'json-to-graphql-query';

const query = {
    query: {
        Posts: {
            id: true,
            title: true,
            post_date: true
        }
    }
};
const graphql_query = jsonToGraphQLQuery(query, { pretty: true });
```

Result:

```
query {
    Posts {
        id
        title
        post_date
    }
}
```

### Query with arguments

Code

```
import { jsonToGraphQLQuery } from 'json-to-graphql-query';

const query = {
    query: {
        Posts: {
            __args: {
                where: { id: 2 }
                orderBy: 'post_date'
            },
            id: true,
            title: true,
            post_date: true
        }
    }
};
const graphql_query = jsonToGraphQLQuery(query, { pretty: true });
```

Result:

```
query {
    Posts (where: {id: 2}, orderBy: "post_date") {
        id
        title
        post_date
    }
}
```

### Query with nested objects

Code:

```
import { jsonToGraphQLQuery } from 'json-to-graphql-query';

const query = {
    query: {
        Posts: {
            id: true,
            title: true,
            comments: {
                id: true,
                comment: true,
                user: true
            }
        }
    }
};
const graphql_query = jsonToGraphQLQuery(query, { pretty: true });
```

Result:

```
query {
    Posts {
        id
        title
        comments {
            id
            comment
            user
        }
    }
}
```

### Query with disabled fields

Code:

```
import { jsonToGraphQLQuery } from 'json-to-graphql-query';

const query = {
    query: {
        Posts: {
            id: true,
            title: false,
            comments: {
                id: true,
                comment: false,
                user: true
            }
        },
        User: false
    }
};
const graphql_query = jsonToGraphQLQuery(query, { pretty: true });
```

Result:

```
query {
    Posts {
        id
        comments {
            id
            user
        }
    }
}
```

NOTE: You can tell jsonToGraphQLQuery() not to exclude keys with a falsy value by setting the includeFalsyKeys option.

### Using aliases

Code:

```
import { jsonToGraphQLQuery } from 'json-to-graphql-query';

const query = {
    query: {
        allPosts: {
            __aliasFor: 'Posts',
            id: true,
            comments: {
                id: true,
                comment: true
            }
        }
    }
};
const graphql_query = jsonToGraphQLQuery(query, { pretty: true });
```

Result:

```
query {
    allPosts: Posts {
        id
        comments {
            id
            comment
        }
    }
}
```

### Query with Enum Values

Code:

```
import { jsonToGraphQLQuery, EnumType } from 'json-to-graphql-query';

const query = {
    query: {
        Posts: {
            __args: {
                orderBy: 'post_date',
                status: new EnumType('PUBLISHED')
            },
            title: true,
            body: true
        }
    }
};
const graphql_query = jsonToGraphQLQuery(query, { pretty: true });
```

Result:

```
query {
    Posts (orderBy: "post_date", status: PUBLISHED) {
        title
        body
    }
}
```

### Query with variables

Code:

```
import { jsonToGraphQLQuery, VariableType } from 'json-to-graphql-query';

const query = {
    query: {
        __variables: {
            variable1: 'String!',
            variableWithDefault: 'String = "default_value"'
        },
        Posts: {
            __args: {
                arg1: 20,
                arg2: new VariableType('variable1')
            },
            id: true,
            title: true
        }
    }
};
const graphql_query = jsonToGraphQLQuery(query, { pretty: true });
```

Result:

```
query ($variable1: String!, $variableWithDefault: String = "default_value") {
    Posts (arg1: 20, arg2: $variable1) {
        id
        title
    }
}
```

### Query with Directives

Code:

```
import { jsonToGraphQLQuery } from 'json-to-graphql-query';

const query = {
    query: {
        __directives: {
            client: true
        }
        Posts: {
            id: true,
            title: true,
            post_date: true
        }
    }
};
const graphql_query = jsonToGraphQLQuery(query, { pretty: true });
```

Result:

```
query {
    Posts @client {
        id
        title
        post_date
    }
}
```

### Ignoring fields in the query object

We sometimes want to ignore specific fields in the initial object, for instance \_\_typename in Apollo queries. You can specify these fields using the ignoreFields option:

Code:

```
import { jsonToGraphQLQuery, VariableType } from 'json-to-graphql-query';

const query = {
    query: {
        Posts: {
            shouldBeIgnored: {
                variable1: 'a value'
            },
            id: true,
            title: true,
            post_date: true
        }
    }
};
const graphql_query = jsonToGraphQLQuery(query, {
    pretty: true,
    ignoreFields: ['shouldBeIgnored']
});
```

Result:

```
query {
    Posts {
        id
        title
        post_date
    }
}
```

### Query with Inline Fragments

Full inline fragments

Code:

```
import { jsonToGraphQLQuery } from 'json-to-graphql-query';

const query = {
    query: {
        Posts: {
            title: true,
            __all_on: [
                "ConfigurablePost",
                "PageInfo"
            ]
        }
    }
};
const graphql_query = jsonToGraphQLQuery(query, { pretty: true });
```

Result:

```
query {
    Posts {
        title
        ...ConfigurablePost
        ...PageInfo
    }
}
```

Partial inline fragments

Code:

```
import { jsonToGraphQLQuery } from 'json-to-graphql-query';

const query = {
    query: {
        Posts: {
            title: true,
            __on: {
                __typeName: "ConfigurablePost",
                id: true
            }
        }
    }
};
const graphql_query = jsonToGraphQLQuery(query, { pretty: true });
```

Result:

```
query {
    Posts {
        title
        ... on ConfigurablePost {
            id
        }
    }
}
```

### Query with multiple Inline Fragments

Code:

```
import { jsonToGraphQLQuery } from 'json-to-graphql-query';

const query = {
            query: {
                Posts: {
                    __on: [
                    {
                        __typeName: "ConfigurablePost",
                        id: true
                    },
                    {
                        __typeName: "UnconfigurablePost",
                        name: true
                    }]
                }
            }
        };
const graphql_query = jsonToGraphQLQuery(query, { pretty: true });
```

Result:

```
query {
    Posts {
        title
        ... on ConfigurablePost {
            id
        }
        ... on UnconfigurablePost {
            name
        }
    }
}
```

### Query with name

Code:

```
import { jsonToGraphQLQuery, VariableType } from 'json-to-graphql-query';

const query = {
    query: {
        __name: 'NewName',
        __variables: {
            variable1: 'String!',
            variableWithDefault: 'String = "default_value"'
        },
        Posts: {
            __args: {
                arg1: 20,
                arg2: new VariableType('variable1')
            },
            id: true,
            title: true
        }
    }
};
const graphql_query = jsonToGraphQLQuery(query, { pretty: true });
```

Result:

```
query NewName ($variable1: String!, $variableWithDefault: String = "default_value") {
    Posts (arg1: 20, arg2: $variable1) {
        id
        title
    }
}
```

### Mutation example

Code:

```
import { jsonToGraphQLQuery, VariableType } from 'json-to-graphql-query';

const mutation = {
    mutation: {
        delete_post: {
            __args: { id: 1234 },
            id: true,
        }
    }
};
const graphql_query = jsonToGraphQLQuery(mutation, { pretty: true });
```

Result:

```
mutation {
    delete_post (id: 1234) {
            id
    }
}
```
