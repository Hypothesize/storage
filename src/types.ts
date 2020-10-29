/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/ban-types */
import { Obj } from "@sparkwave/standard/utility"
import { FilterGroup } from "@sparkwave/standard/collections/"

export interface Ctor<TArgs = unknown, TObj = Obj> { new(args: TArgs): TObj }

export interface IOProvider<S extends Schema, X extends Obj = Obj> {
	/** Find one entity object; throws exception if not found */
	findAsync: <E extends keyof S>(_: { entity: E, id: string }) => Promise<From<S, E>>

	/** Get a set of entity objects */
	getAsync: <E extends keyof S>(_: { entity: E, parentId?: string, filters?: FilterGroup<From<S, E>> }) => Promise<From<S, E>[]>

	/** Insert or update a set of entity objects */
	saveAsync: <E extends keyof S>(_: { entity: E, data: To<S, E>[], mode: "insert" | "update" }) => Promise<From<S, E>[]>

	deleteAsync: <E extends keyof S>(_: { entity: E, id: string }) => Promise<From<S, E>>
	deleteManyAsync?: <E extends keyof S>(_: { entity: E } & ({ ids: string[] } | { parentId: string })) => Promise<From<S, E>[]>

	extensions: X
}

export type EntityCache<S extends Schema> = {
	[e in keyof S]: {
		objects: Obj<Promise<TypeFromEntity<S[e]["fromStorage"]>>, string /*entityId*/>,
		collections: Obj<Promise<TypeFromEntity<S[e]["fromStorage"]>[]>, string /* {parentEntityId, filters (as JSON)} */>,
	}
}

export interface RepositoryReadonly<Out extends Obj> {
	/** find one entity object with a specific id, throws exception if not found */
	findAsync(id: string): Promise<Out>

	/** get entity objects with optional parent and additional filters ... */
	getAsync(args: { parentId: string, filters?: FilterGroup<Out> }): Promise<Out[]>
}

export interface Repository<In extends Obj, Out extends Obj> extends RepositoryReadonly<Out> {
	saveAsync: (data: In[], mode: "insert" | "update") => Promise<Out[]>
	deleteAsync: (id: string) => Promise<Out>
	deleteManyAsync?: (args: { parentId: string } | { ids: string[] }) => Promise<Out[]>
}

type PrimitiveTypeString = "string" | "number" | "boolean"
type PrimitiveType<T extends PrimitiveTypeString> = (T extends "string" ? string : T extends "number" ? number : boolean)

/** Entity specification in terms of fields. By convention, "id" field, if present, is the primary key */
type PrimitiveField = PrimitiveTypeString | { type: PrimitiveTypeString, isNullable?: boolean }
type ArrayField = "array" | { type: "array", arrayType: PrimitiveTypeString | Entity, isNullable?: boolean }
type Field = (PrimitiveField | ArrayField)

export type Entity = Obj<Field>
export type TypeFromEntity<E extends Entity | undefined> = {
	[k in keyof E]: E[k] extends { type: PrimitiveTypeString }
	? PrimitiveType<E[k]["type"]>
	: E[k] extends PrimitiveTypeString
	? PrimitiveType<E[k]>
	: E[k] extends "array"
	? unknown[]
	: E[k] extends { type: "array", arrayType: Entity, isNullable?: boolean }
	? TypeFromEntity<E[k]["arrayType"]>[]
	: E[k] extends { type: "array", arrayType: PrimitiveTypeString, isNullable?: boolean }
	? PrimitiveType<E[k]["arrayType"]>[]
	: never
}

export type Schema = Obj<{
	/** Entity type to storage, if entity is read-write */
	toStorage?: Entity
	/** Entity type from storage, merged with toStorage type, if present; So no need to repeat fields from toStorage */
	fromStorage: Entity
}>

export type To<S extends Schema, E extends keyof S> = TypeFromEntity<S[E]["toStorage"]>
export type From<S extends Schema, E extends keyof S> = To<S, E> & TypeFromEntity<S[E]["fromStorage"]>

export type RepositoryGroup<S extends Schema, X extends Obj = {}> = {
	[key in keyof S]: (
		To<S, key> extends never
		? RepositoryReadonly<From<S, key>>
		: Repository<To<S, key>, From<S, key>>
	)
} & {
	/** A method to remove an entry from the cache */
	invalidateCache: (entity: keyof S, key?: { objectId: string } | { parentId: string }) => void
} & {
	extensions: X
}



// Test

// eslint-disable-next-line @typescript-eslint/no-unused-vars, init-declarations, fp/no-let

/*export interface IOProvider<M extends Schema, X extends Obj = Obj> {
	// find one entity object; throws exception if not found
	findAsync: <E extends keyof M>(args: { entity: E, id: string }) => Promise<M[E]["fromStorage"]>

	// get a set of entity objects
	getAsync: <E extends keyof M>(args: { entity: E, parentId?: string, filters?: FilterGroup<M[E]["fromStorage"]> }) => Promise<M[E]["fromStorage"][]>

	saveAsync: <E extends keyof M>(args: { entity: E, obj: M[E]["toStorage"][], mode: "insert" | "update" }) => Promise<M[E]["fromStorage"][]>
	deleteAsync: <E extends keyof M>(args: { entity: E, id: string }) => Promise<M[E]["fromStorage"]>
	deleteManyAsync?: <E extends keyof M>(args: { entity: E } & ({ ids: string[] } | { parentId: string })) => Promise<M[E]["fromStorage"][]>
	extensions: X
}*/
