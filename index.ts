const fs = require('fs');
const util = require('util');

// interfaces
interface Ingredient {
    name: string;
    unit: string
    amount: number;
}

interface Recipe {
    name: string;
    ingredients: Ingredient[]
}

interface MealEntry {
    name: string;
    options: Recipe[]
}

interface Meal {
    name: string;
    recipe: Recipe;
}

interface CookbookDay {
    day: number;
    meals: Meal[];
}

interface Cookbook {
    totalIngredients(): Ingredient[];
    days: CookbookDay[];
    add(cd: CookbookDay): Cookbook;
}

const IngredientTally = () => ({
    _ingredients: {},
    getTotal() {
        return this._ingredients;
    },
    add(i: Ingredient) {
        if (!(i.name in this._ingredients))
            this._ingredients[i.name] = {amount: 0, unit: i.unit};

        this._ingredients[i.name].amount += i.amount;
        return this;
    }
});

const MyCookbook = () =>  ({
    days: [],
    ingredientTally: IngredientTally(),
    totalIngredients() {
        return this.ingredientTally.getTotal();
    },
    add({day, meals}: CookbookDay) {
        this.days = this.days.concat({day, meals});
        const ings = meals.reduce((acc, m) => acc.concat(m.recipe.ingredients), []);
        for (const i of ings) 
            this.ingredientTally.add(i);

        return this;
    }
})

// utils
const readFile = util.promisify(fs.readFile);
const map = f => ar => ar.map(f);
const reduce = (f, seed) => ar => ar.reduce(f, seed);
const tap = f => obj => {
    f(obj);
    return obj;
};
const indices = (_x: any, i: number): number => i + 1;

const asIngredient = (entry: [string, {unit: string, amount: number}]): Ingredient => ({
    name: entry[0],
    unit: entry[1].unit,
    amount: entry[1].amount
});

const asRecipe = (r: any): Recipe => ({
    name: r.name,
    ingredients: 
        Object.entries(r.ingredients)
        .map(asIngredient)
});

const asMealEntries = (entry: [string, any]): MealEntry => ({
    name: entry[0],
    options: entry[1].map(asRecipe)
});

const drawDailyMeals = (meals: MealEntry[]): Meal[] => {
    const retval = [];
    for (const {name, options} of meals) {
        const ind = Math.floor(Math.random() * options.length)
        retval.push({name: name, recipe: options[ind]});
    }
    return retval;
}


const reduceCookbook = (ents: MealEntry[]) => (cb: Cookbook, i: number): Cookbook => 
    cb.add({day: i, meals: drawDailyMeals(ents)});

const createCookbok = (daysNo: number) => (ents: MealEntry[]): Cookbook => {
    return Array(daysNo).fill(null)
        .map(indices)
        .reduce(reduceCookbook(ents), MyCookbook())
};

// {day: 1, breakfast: recipe}
const reduceDay = (day: number) => 
    ((acc:object, {name, recipe}) => ({...acc, day, [name]: recipe.name}));

const listDays = (cb: Cookbook): void => {
    const days = cb.days.map(({day, meals}) => meals.reduce(reduceDay(day), {}));
    console.table(days);
}

const listTotal = (cb: Cookbook): void => console.table(cb.totalIngredients())

readFile('limits.json', 'utf-8')
.then(JSON.parse)
.then(Object.entries)
.then(map(asMealEntries))
.then(createCookbok(5))
.then(tap(listDays))
.then(tap(listTotal));

