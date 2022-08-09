// TODO: add better error handling

// Some constants
const TT_WORD = ':word:';
const ARTICLES = 'a|an|the';

// GameObject test class
class GameObject {
    constructor(name) {
        this.name = name;
    }
}

// Verb class to store the name(s) of the verb and a group of rules.
//
// `name` should be a list and each entry should be a single word.
//     This allows for synonyms e.g. ['take', 'get']
//
// `ruleActionMap` should be a Map object where keys are rules and values are functions
//     NOTE: I'm pretty sure a 2d array would also work here, but I started with a Map so I'm keeping it.
//
// Rules should be strings with literals quoted
//     (see verb rules for give ... to ... in `verbs` where 'to' is quoted)
//
// Two+ word commands like 'pick up' have:
//     name = ['first_word'] 
//     rule = ['"rest of the words" some_symbol', actionFunction]
//     (see verb rules for pick up in `verbs`)
//
// The parser attemps to match the provided rules.
//     If it succeeds the associated action function is called.
class Verb {
    constructor(name, ruleActionMap) {
        this.name = name;
        this.ruleActionMap = ruleActionMap;
    }
}

// Verb Rules (VERY limited)
// Verbs and rules can be easily added.
const verbs = [
    // Give ...
    new Verb(['give'], new Map([
        // Note in the rule below that 'single' is not quoted.
        // The parser will attempt to find a 'single' in the input using a specified parsing function.
        //     (see `tokenParsingFunctionMap` defined after the verbs list)
        ['single single', actionGive],
        // Note in the rule below that 'to' is quoted.
        // The parser will look for the literal word "to".
        ['single "to" single', actionGiveReversed],
    ])),
    // Pick up ...
    new Verb(['pick'], new Map([
        ['"up" single', actionTake],
        ['"up" single "on" single', actionTakeFrom],
    ])),
    // Dance (why not?)
    new Verb(['dance'], new Map([
        ['', actionDance],
        ['dance_style', actionDanceWithStyle],
    ])),
    // Put / Place ...
    new Verb(['put', 'place'], new Map([
        ['single "on" single', actionPut],
    ])),
    // Gain possession of
    new Verb(['gain'], new Map([
        ['"possession of" single', actionTake],
    ])),
]

// Functions to use when non-literal symbols are encountered.
//     (these parsing functions are defined later in the program)
const tokenParsingFunctionMap = new Map([
    ['single', parseSingle],
    ['dance_style', parseDanceStyle], // (see rules for the 'dance' verb above)
]);

// The 'action' part of the ruleActionMap.
// These functions get called when an associated rule is matched by the parser.
//     In a real game these functions would have a lot more to them,
//     but this is just a proof of concept.
function actionTake(object) {
    return `You take the ${object.name.join(' ')}`;
}
function actionTakeFrom(object, container) {
    return `You take the ${object.name.join(' ')} from the ${container.name.join(' ')}`;
}
function actionGive(recipient, object) {
    return `You give the ${object.name.join(' ')} to the ${recipient.name.join(' ')}`;
}
function actionGiveReversed(object, recipient) {
    actionGive(recipient, object);
}
function actionDance() {
    return 'You flail around wildly. Everyone judges you.';
}
function actionDanceWithStyle(style) {
    return `You dance the ${style} very well`;
}
function actionPut(object, surface) {
    return `You put the ${object.name.join(' ')} on the ${surface.name.join(' ')}`;
}

// Token class to use when tokenizing rule strings.
//     (not used when tokenizing input strings)
class Token {
    constructor(type, value) {
        this.type = type;
        this.value = value;
    }
}

// TokenList
// It's, well... a list to store tokens
// (it's basically an array with extra features)
class TokenList {
    constructor(tokens) {
        this.tokens = tokens;
        this.index = -1;
    }

    // Advance the index and return the token at that index.
    // (or null if index >= tokens.length)
    nextToken() {
        this.index++;
        return this.currentToken();
    }

    // Get the token at the current index.
    // (or null if index >= tokens.length)
    currentToken() {
        if (this.index < this.tokens.length) {
            return this.tokens[this.index];
        }
        return null;
    }

    // Return the next token without changing the index.
    // (or null if index >= tokens.length)
    lookAhead() {
        const nextToken = this.nextToken();
        // Okay, okay. It does technically change the index, but look...
        // It changes it back right here.
        this.index--;
        return nextToken;
    }
}

// A function to tokenize rules.
function tokenizeRule(rule) {
    // Where the tokens go.
    const tokens = []

    // Start by splitting the string into literals and symbols.
    const ruleParts = rule.match(/".+?"|\S+/g);

    // If `ruleParts` is null the rule was blank.
    // (I'm not sure if `ruleParts` can be null for any other reason)
    //     (maybe an incorrectly formatted rule?)
    // Whatever the reason for `ruleParts` being null, this function must return an array,
    //     so an empty array is returned.
    if (!ruleParts) {
        return [];
    }

    // If `ruleParts` isn't null, the parts have to be broken down further and labeled with a type
    //     and possibly a value.
    //
    // Everything in quotes gets type = TT_WORD constant (see WAY above) and a value of the word itself.
    //     e.g. {type: TT_WORD, value: 'to'}
    //
    // Everything else gets the type equal to itself and a null value.
    //     e.g. {type: 'single', value: null}
    for (const part of ruleParts) {
        if (part[0] === '"') {
            const words = part.match(/[a-z]+/g);
            for (const word of words) {
                tokens.push(new Token(TT_WORD, word));
            }
        } else {
            tokens.push(new Token(part, null));
        }
    }

    return tokens;
}

// DEBUGGING for `tokenizeRule`:
//console.log(tokenizeRule('"up" single'));
//console.log(tokenizeRule('"up" single "on" single'));


// Function to tokenize the input string.
function tokenizeInputString(str) {

    // Create a regular expression to match articles i.e. 'a', 'an', and 'the'
    //     (probably could be made a constant)
    // NOTE: A cool thing I learned is that, if you put `String.raw` before a string,
    //     backslashes don't have to be escaped. (it's like r'' in python)
    const articlesRegEx = RegExp(String.raw`\s+(${ARTICLES})\s+`, 'g');

    // Remove whitespace from either end of the string.
    // Make it all lower case.
    // Remove articles (replace with a space).
    // Replace any run of whitespace characters with a space.
    //     e.g. three spaces in a row become one space.
    // Split the string on spaces.
    return str.trim().toLowerCase().replace(articlesRegEx, ' ').replace(/\s+/g, ' ').split(' ');
}

// DEBUGGING for `tokenizeInputString`:
//console.log(tokenizeInputString('pick up string'));
//console.log(tokenizeInputString('pick up small key on desk'));


// Fake a room for the `parseSingle` function to use
function getGameObjectsFromCurrentRoom() {
    // Make a fake room full of fake things.
    return [
        new GameObject(['old', 'rusty', 'key']),
        new GameObject(['old', 'man']),
        new GameObject(['desk']),
        new GameObject(['big', 'crate']),
        new GameObject(['small', 'crate']),
    ];
}

// Function to call when 'single' symbol is encountered during parsing.
// The function gives each GameObject a score based on how many words in a row from the input are in the objects name.
//     The word 'old' will match both 'old rusty key' and 'old man'.
//     In this function, an object can be inferred from just its adjectives.
//         e.g. 'old rusty' will be interpreted as the 'old rusty key'
//     Is this a good way to do it? Maybe not, but it's fast and it works (for some definition of works).
//     NOTE: I stole the idea for this type of matching from another parser.
// This function gets passed the TokenList from the parser so the parser can pick up where this function leaves off.
//     (Pass-by-reference and all that)
function parseSingle(inputTokens) {
    // Keep track of the starting index in the TokenList to return to when testing each new object.
    const startIndex = inputTokens.index;

    // Gets a list of objects to test.
    const gameObjects = getGameObjectsFromCurrentRoom();

    // Variables to store the best match and best score.
    // `bestMatch` is a list, so multiple objects with the same 'best' score can be stored.
    //     Each element of `bestMatch` will be a list containing an object and the index of the token where the match ended.
    //         like [GameObject, index]
    //     Multiple best matches are handled later.
    //     I use the word 'handled' here very loosely.
    let bestMatch = [];
    let bestMatchScore = 0;

    // Go through every GameObject in `gameObjects` and give it a score.
    for (const gameObject of gameObjects) {
        inputTokens.index = startIndex;
        let matchScore = -1;

        // If the object has a special function to score its own name, call it.
        // (This is not implemented in this program... yet)
        if (gameObject.parseName) {
            matchScore = gameObject.parseName();
        }

        // If the function above returns -1, the object is declining to score itself,
        //     and the default score method will proceed.
        if (matchScore === -1) {
            matchScore = 0;

            // For every matching word increase the score until a word doesn't match.
            while (inputTokens.currentToken()) {
                if (gameObject.name.includes( inputTokens.currentToken())) {
                    matchScore++;
                } else {
                    break;
                }
                inputTokens.nextToken();
            }
        }

        // If the score is zero, the object didn't match any words and should be ignored.
        // If the score is greater than 0, and...
        if (matchScore > 0) {
            // ...matches `bestMatchScore`, push the object and ending index to `bestMatch`
            if (matchScore == bestMatchScore) {
                bestMatch.push([gameObject, inputTokens.index]);
            } 
            // ...beats `bestMatchScore`, replace `bestMatch` with an array containing the object and ending index
            //     and update `bestMatchScore`.
            else if (matchScore > bestMatchScore) {
                bestMatch = [[gameObject, inputTokens.index]];
                bestMatchScore = matchScore;
            }
        }
    }

    // If the score is greater than 0, at least one match must have been found.
    if (bestMatchScore > 0) {
        // If the length of `bestMatch` is 1, the object was matched unambiguously
        //     and should be returned after setting the TokenList index to the index of the last matching token.
        if (bestMatch.length === 1) {
            inputTokens.index = bestMatch[0][1];
            return {result: bestMatch[0][0], error: null};
        }
        // If multiple matches were found, return an error,
        return {result: null, error: 'multiple objects found'};
    }
    // If no matches were found, return a different error.
    return {result: null, error: 'no objects found'};
}

// Function to call when 'dance_style' symbol is encountered during parsing.
// Determining how this function works is left as an exercise to the reader.
// i.e. I'm to lazy to comment it, but it basically just tries to match the whole word.
function parseDanceStyle(inputTokens) {
    const startIndex = inputTokens.index;
    const dances = ['waltz', 'tango', 'funky chicken'];

    for (const dance of dances) {
        inputTokens.index = startIndex;
        const danceWords = [];

        const splitDance = dance.split(' ');

        for (let i = 0; i < splitDance.length; i++) {
            if (!inputTokens.currentToken()) {
                break;
            }
            danceWords.push(inputTokens.currentToken());
            inputTokens.nextToken();
        }

        if (danceWords.join(' ') === dance) {
            return {result: dance, error: null};
        }
    }
    inputTokens.index = startIndex;
    return {result: null, error: 'I don\'t know that dance'};
}

// The main parsing function
function parse(str) {

    console.log('Parsing String:', str);

    // Tokenize the input string.
    const inputTokens = new TokenList(tokenizeInputString(str));
    // Get the verb (assumed to be the first word in the string).
    const inputVerb = inputTokens.nextToken();

    // Try matching the verb with a verb in the verbs list (defined above).
    for (const verb of verbs) {
        // If a match is found...
        if (verb.name.includes(inputVerb)) {
            
            console.log(`\tVerb '${inputVerb}' found in verbs list!`);
            
            // ...iterate through every rule.
            for (const ruleAction of verb.ruleActionMap) {

                console.log('\tTrying rule:', ruleAction[0] !== '' ? ruleAction[0] : '[blank]');

                // Set the index to the first non-verb token in `inputTokens` for each go-around.
                inputTokens.index = 1;

                // Set a variable to store the parameters that will be passed to the rule's associated action
                //     if the rule is matched.
                const actionParameters = [];

                // Tokenize the rule and store the action to call later if the rule is matched.
                const ruleTokens = new TokenList(tokenizeRule(ruleAction[0]));
                const action = ruleAction[1];
                
                // For each token in `ruleTokens`...
                while (ruleTokens.nextToken() !== null) {

                    // Get the current token from each TokenList
                    const inputToken = inputTokens.currentToken();
                    const ruleToken = ruleTokens.currentToken();
                    
                    console.log('\t\tRule token:', ruleToken);
                    console.log('\t\tInput token:', inputToken);
                    
                    // If `ruleToken` type is TT_WORD, it is a literal.
                    // If its value doesn't match `inputToken` the rule is not a match.
                    // i.e. The parser expected to see a specific word but got a different word. (no good)
                    if (ruleToken.type === TT_WORD && !(ruleToken.value === inputToken)) {
                        // Stop checking current rule.
                        break;
                    }
                    // If `ruleToken` type is not TT_WORD, it is a symbol and must be parsed.
                    else if (ruleToken.type !== TT_WORD) {

                        // If the symbol has an associated function in tokenParsingFunctionMap...
                        if (tokenParsingFunctionMap.has(ruleToken.type)) {

                            console.log('\t\tEntering function:', tokenParsingFunctionMap.get(ruleToken.type).name);

                            // ...call the function and store the results.
                            const parseResult = tokenParsingFunctionMap.get(ruleToken.type)(inputTokens);

                            // If no error is returned store the results in `actionParameters` to be used if the rule matches.
                            if (!parseResult.error) {

                                console.log('\t\t\tResult:', parseResult.result);

                                actionParameters.push(parseResult.result);
                            } 
                            // Otherwise, stop checking the current rule.
                            else {
                                // TODO: add better error handling.
                                console.log('\t\t\tUh-oh:', parseResult.error);
                                
                                break;
                            }
                        } 
                        // If the symbol doesn't have an associated function in tokenParsingFunctionMap stop checking the current rule.
                        else {
                            
                            console.log(`\t\tToken '${ruleToken.type}' has no associated parsing rule.`)
                            
                            break;
                        }
                    }
                    // If the current rule token is of type TT_WORD and DOES match, continue parsing the input.
                    else {
                        inputTokens.nextToken();
                    }
                }

                // If the end of both TokenLists has been reached, the rule matched. (I think)
                if (ruleTokens.lookAhead() === null && inputTokens.currentToken() === null) {

                    console.log('\tGood rule found:', ruleAction[0]);

                    // Call the associated action and return the result.
                    return action(...actionParameters);
                }
                // If one or both TokenLists still have tokens in them at this point, the rule was not matched.
                else {
                    console.log('\t\tRule failed!')
                    console.log('\t\tCause of failure:')
                    if (ruleTokens.lookAhead() !== null) {
                        console.log('\t\t\tToken(s) in rule remaining:');
                        console.log(`\t\t\t\t${ruleTokens.tokens.slice(ruleTokens.index).map(e => e.type)}`);
                    }
                    if (inputTokens.currentToken() !== null) {
                        console.log('\t\t\tToken(s) in input remaining:');
                        console.log(`\t\t\t\t${inputTokens.tokens.slice(inputTokens.index)}`);
                    }
                }
            }
        }
    }
    // If the function gets here, no matching rule was found (sad days!).
    // Return a generic "I don't understand" message.
    console.log('\tNo good rules found!');
    return 'I don\'t understand.';
}

// Function for quickly attempting to parse strings
const testParse = (str) => {console.log('\n>>>', parse(str) + '\n ');}

// Some tests you can try out (uncomment them and run this file with node)

//testParse('pick up old key on desk');
//testParse('pick up old rusty on desk');
//testParse('give old man key');
//testParse('give old to old'); // Should fail (old could refer to the key or the man)
//testParse('dance');
//testParse('dance the funky chicken');
//testParse('dance the ghillie callum'); // Should fail (see `parseDanceStyle`)
//testParse('pick up old key on desk on'); // Should fail (to many 'on's)
//testParse('put crate on crate'); // Should fail (there are two crates)
//testParse('put small crate on big crate');
//testParse('gain possession of old rusty key');

// Now, make up your own grammar rules and parsing functions!