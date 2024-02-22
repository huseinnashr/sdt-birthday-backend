# Getting Started
## A. DB Migration
1. Install Goose
2. Export the following ENV
```
export GOOSE_DRIVER=postgres 
export GOOSE_DBSTRING="postgres://postgres:postgres@localhost:5432/birthday" 
```
3. Run `goose -dir migration up`

## Documentation
### ERD
```mermaid
erDiagram
USERS {
    bigint id PK
    string first_name
    string last_name
    date birthday_date
    string timezone
}