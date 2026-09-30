import { Command } from './types.js';
import pingCommand from './ping.js';

const commands: Command[] = [
    pingCommand
];

export function getCommand(name: string): Command | undefined {
    return commands.find((command) => {
        return command.name == name || command.aliases?.includes(name);
    })
}