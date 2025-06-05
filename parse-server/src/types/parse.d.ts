declare namespace Parse {
  interface Attributes {
    [key: string]: any;
  }

  interface User<T extends Attributes = Attributes> {
    id: string;
    get(attr: string): any;
    set(attr: string, value: any): this;
    set(attrs: { [key: string]: any }): this;
    save(attrs?: { [key: string]: any }, options?: { sessionToken?: string; useMasterKey?: boolean }): Promise<this>;
    fetch(options?: { sessionToken?: string; useMasterKey?: boolean }): Promise<this>;
    destroy(options?: { sessionToken?: string; useMasterKey?: boolean }): Promise<this>;
    toJSON(): { [key: string]: any };
    getSessionToken(): string;
    signUp(): Promise<this>;
    logIn(): Promise<this>;
    logOut(): Promise<void>;
    getUsername(): string;
    setUsername(username: string): void;
    getEmail(): string;
    setEmail(email: string): void;
    authenticated(): boolean;
    isCurrent(): boolean;
    _getRoles(options?: { sessionToken?: string; useMasterKey?: boolean }): Promise<Role[]>;
  }

  interface Role extends Parse.Object<Attributes> {
    getName(): string;
    setName(name: string): void;
    getUsers(): Parse.Relation;
    getRoles(): Parse.Relation;
  }

  interface Query<T extends Object = Object> {
    equalTo(key: string, value: any): this;
    notEqualTo(key: string, value: any): this;
    lessThan(key: string, value: any): this;
    greaterThan(key: string, value: any): this;
    lessThanOrEqualTo(key: string, value: any): this;
    greaterThanOrEqualTo(key: string, value: any): this;
    containedIn(key: string, values: any[]): this;
    notContainedIn(key: string, values: any[]): this;
    containsAll(key: string, values: any[]): this;
    exists(key: string): this;
    doesNotExist(key: string): this;
    matches(key: string, regex: RegExp, modifiers?: string): this;
    startsWith(key: string, prefix: string): this;
    endsWith(key: string, suffix: string): this;
    limit(n: number): this;
    skip(n: number): this;
    ascending(...keys: string[]): this;
    descending(...keys: string[]): this;
    include(...keys: string[]): this;
    select(...keys: string[]): this;
    withJSON(json: any): this;
    find(options?: { sessionToken?: string; useMasterKey?: boolean }): Promise<T[]>;
    get(objectId: string, options?: { sessionToken?: string; useMasterKey?: boolean }): Promise<T>;
    first(options?: { sessionToken?: string; useMasterKey?: boolean }): Promise<T | undefined>;
    count(options?: { sessionToken?: string; useMasterKey?: boolean }): Promise<number>;
  }

  interface Object<T extends Attributes = Attributes> {
    id: string;
    className: string;
    get(attr: string): any;
    set(attr: string, value: any): this;
    set(attrs: { [key: string]: any }): this;
    save(attrs?: { [key: string]: any }, options?: { sessionToken?: string; useMasterKey?: boolean }): Promise<this>;
    fetch(options?: { sessionToken?: string; useMasterKey?: boolean }): Promise<this>;
    destroy(options?: { sessionToken?: string; useMasterKey?: boolean }): Promise<this>;
    toJSON(): { [key: string]: any };
  }

  interface Relation<T extends Object = Object> {
    query(): Query<T>;
    add(object: T | T[]): void;
    remove(object: T | T[]): void;
  }

  const Object: {
    extend<T extends Attributes>(className: string): { new(): Object<T> };
    fromJSON(json: any): Object;
  };

  const Query: {
    new <T extends Object>(objectClass: string | { className: string }): Query<T>;
  };

  const User: {
    new <T extends Attributes>(): User<T>;
    current(): User | null;
    logIn(username: string, password: string): Promise<User>;
    logOut(): Promise<void>;
  };
}

export = Parse;
export as namespace Parse;
