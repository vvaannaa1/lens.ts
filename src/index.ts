// скопипизжено из https://github.com/hatashiro/lens.ts

export type Getter<T, V> = (target: T) => V;
export type Setter<T> = (target: T) => T;
export type Lens<T, U> = LensImpl<T, U> & LensProxy<T, U>;
export type LensProxy<T, U> = { readonly [K in keyof U]: Lens<T, U[K]> };

export class LensImpl<T, U> {
  constructor(
    private getter: Getter<T, U>,
    private setter: (value: U) => Setter<T>,
  ) {}

  public k<K extends keyof U>(key: K): Lens<T, U[K]> {
    return this.compose(
      lens(
        (t) => t[key],
        (v) => (t) => {
          const copied = copy(t);
          copied[key] = v;

          return copied;
        },
      ),
    );
  }

  public compose<V>(other: Lens<U, V>): Lens<T, V> {
    return lens(
      (t) => other.getter(this.getter(t)),
      (v) => (t) => this.setter(other.setter(v)(this.getter(t)))(t),
    );
  }

  public get(): Getter<T, U>;
  public get<V>(f: Getter<U, V>): Getter<T, V>;
  public get<V>(f?: Getter<U, V>) {
    if (f) {
      return (t: T) => f(this.getter(t));
    }

    return this.getter;
  }

  public set(value: U): Setter<T> {
    return this.setter(value);
  }

  public modify(modifier: Setter<U>): Setter<T> {
    return (t: T) => this.setter(modifier(this.getter(t)))(t);
  }
}

function copy<T>(x: T): T {
  if (Array.isArray(x)) {
    return x.slice() as T;
  }

  if (x && typeof x === 'object') {
    return { ...x };
  }

  return x;
}

function proxify<T, U>(impl: LensImpl<T, U>): Lens<T, U> {
  return new Proxy(impl, {
    get: (target, prop) => target.k(prop as keyof U),
  }) as Lens<T, U>;
}

export function lens<T>(): Lens<T, T>;
export function lens<T, U>(
  getter: Getter<T, U>,
  setter: (value: U) => Setter<T>,
): Lens<T, U>;
export function lens<T, U>(
  getter?: Getter<T, U>,
  setter?: (value: U) => Setter<T>,
) {
  if (getter && setter) {
    return proxify(new LensImpl(getter, setter));
  }

  return lens(
    (t) => t,
    (v) => () => v,
  );
}
