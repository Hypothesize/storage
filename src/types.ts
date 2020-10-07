import { ExtractByType, Obj, Primitive, FilterGroup } from "@sparkwave/standard"

export interface Ctor<TArgs = {}, TObj = {}> { new(args: TArgs): TObj }

type DTO = {
	toStorage: Obj<any> & { id?: string }
	fromStorage: Obj<any>
}
export type DTOsMap = { [key: string]: DTO }

export type CacheEntry<D extends DTOsMap> = (
	| {
		type: "single"
		key: string,
		content?: Promise<D[keyof D]["fromStorage"]>
	}
	| {
		type: "multiple"
		keys: { entity: keyof D, parentId: string, filters?: string },
		content?: Promise<D[keyof D]["fromStorage"][]>
	}
)

export interface IOProvider<X = {}, D extends DTOsMap = DTOsMap> {
	/** find one entity object, throws exception if not found */
	findAsync: <E extends keyof D>(args: { entity: E, id: string }) => Promise<D[E]["fromStorage"]>

	/** get a set of entity objects */
	getAsync: <E extends keyof D>(args: { entity: E, parentId?: string, filters?: FilterGroup<ExtractByType<D[E]["fromStorage"], Primitive>> }) => Promise<D[E]["fromStorage"][]>
	saveAsync: <E extends keyof D>(args: {
		entity: E,
		obj: D[E]["toStorage"][],
		mode: "insert" | "update"
	}) => Promise<D[E]["fromStorage"][]>
	deleteAsync: <E extends keyof D>(args: { entity: E, id: string }) => Promise<D[E]["fromStorage"]>
	deleteManyAsync?: <E extends keyof D>(args: { entity: E } & ({ ids: string[] } | { parentId: string })) => Promise<D[E]["fromStorage"][]>
	extensions: X
}

export namespace Filters {
	export interface Base<TObj extends Obj<Primitive>, TVal extends Primitive | null> {
		fieldName: keyof (ExtractByType<TObj, TVal>),
		value: TVal,
		negated?: boolean
	}
	export interface Categorical<T extends Obj<Primitive>> extends Base<T, Primitive | null> {
		operator: "equal" | "not_equal",
	}
	export interface Ordinal<T extends Obj<Primitive>> extends Base<T, number> {
		operator: "greater" | "greater_or_equal" | "less" | "less_or_equal",
		negated?: boolean
	}
	export interface Textual<T extends Obj<Primitive>> extends Base<T, string> {
		operator: "contains" | "starts_with" | "ends_with",
	}
	export interface Statistical<T extends Obj<Primitive>> extends Base<T, number> {
		operator: "is_outlier_by",
		/** number of std. deviations (possibly fractional) */
		//value: number
	}
}