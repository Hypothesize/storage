/** The parent object (in a relational-database sense) of our entities */
export enum EntityParents {
	user = "",
	project = "user",
	column = "table",
	analysis = "project",
	table = "project",
	result = "analysis"
}