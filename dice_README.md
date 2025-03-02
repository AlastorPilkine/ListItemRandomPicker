Dynamic Dice Rolls in Your Text
This system allows you to embed dice roll expressions directly within your text, dynamically generating and displaying the results. This is perfect for interactive stories, game aids, or any situation where you need to randomly generate numbers based on dice rolls.

Syntax
To insert a dice roll, use the following syntax:

{dice_expression}

Replace dice_expression with the dice roll you want to perform. Here's a breakdown of the supported syntax:

Basic Rolls:
NdX: Roll N dice with X sides each.
Example: 2d6 (roll two six-sided dice), 1d20 (roll one twenty-sided die).
Modifiers:
NdX+M: Roll N dice with X sides each, then add M.
Example: 1d20+5 (roll a d20 and add 5), 2d6-1 (roll two d6 and subtract 1).
Exploding Dice:
NdXe: Roll N dice with X sides each, and if a die rolls its maximum value, roll it again and add the result.
Example: 1d6e (roll a six-sided die, and explode on 6).
Keep Highest/Lowest:
NdXkH: Roll N dice with X sides each, and keep the H highest results.
Example: 4d6k3 (roll four d6 and keep the three highest).
NdXkL: Roll N dice with X sides each, and keep the L lowest results.
Example: 4d6kl3 (roll four d6 and keep the three lowest).
Examples
Here are some examples of how you can use dice roll expressions in your text:

"The hero attacks for {2d6+3} damage."
"The enemy makes a saving throw: {1d20}."
"You find {3d10} gold pieces."
"The orc swings its greataxe for {1d12+2} damage."
"Roll for initiative: {1d20}."
"The dragon breathes fire for {6d6e} damage."
"Roll your stats: {4d6kl3}, {4d6kl3}, {4d6kl3}, {4d6kl3}, {4d6kl3}, {4d6kl3}"
Usage in Lists
You can use the dice roll syntax in list elements, too:

"Here are your stats:"
"{4d6k3}"
"{4d6k3}"
"{4d6k3}"
"{4d6k3}"
"{4d6k3}"
"{4d6k3}"
Important Notes
The system will automatically replace the dice roll expression with the calculated result.
If an expression is invalid, it will be left as is.
The system is case-insensitive. "2D6" is the same as "2d6".