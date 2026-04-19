import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import importPlugin from "eslint-plugin-import";
import prettierConfig from "eslint-plugin-prettier/recommended";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
	{
		languageOptions: {
			globals: { ...globals.node }
		}
	},
	js.configs.recommended,
	tseslint.configs.recommended,
	prettierConfig,
	{
		files: ["**/*.{ts,mts,cts}"],
		plugins: {
			"@typescript-eslint": tseslint.plugin,
			import: importPlugin
		},
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: { ecmaVersion: "latest", sourceType: "module" }
		},
		settings: {
			"import/resolver": {
				typescript: {
					alwaysTryTypes: true,
					project: "./tsconfig.json"
				}
			}
		},
		rules: {
			"@typescript-eslint/no-explicit-any": "warn",
			"no-unused-vars": "off",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					vars: "all",
					args: "after-used",
					caughtErrors: "all",
					argsIgnorePattern: "^_",
					caughtErrorsIgnorePattern: "^_",
					destructuredArrayIgnorePattern: "^_",
					varsIgnorePattern: "^_"
				}
			],
			"@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
			eqeqeq: ["error", "always"],
			"import/order": [
				"error",
				{
					groups: ["builtin", "external", "internal", "parent", "sibling", "index", "object", "type"],
					"newlines-between": "never",
					alphabetize: {
						order: "asc",
						caseInsensitive: true
					}
				}
			]
		}
	}
]);
