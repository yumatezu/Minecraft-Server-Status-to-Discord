const http = require("https");

const discord = require("discord.js");
const client = new discord.Client();
var fs = require('fs');

require('string.format');
require('console-stamp')(console, {pattern: 'dd/mm/yy HH:MM:ss.l', 'label': false, colors: {stamp: 'gray'}});
const chalk = require('chalk');

const configdir = "./config.json";
var config = JSON.parse(fs.readFileSync(configdir, "utf-8"));

var svrdata = config.ServerData;

function ping_server() {
    const URL = `https://api.mcsrvstat.us/1/${config.ServerData.hostname}`
    http.get(URL, (res) => {
        console.info(chalk.magenta(`[PING]`)+" Pinging server")
        let body = '';
        res.setEncoding('utf8');
      
        res.on('data', (chunk) => {
            body += chunk;
        });
      
        res.on('end', (res) => {
            res = JSON.parse(body);
            if (res.offline){
                console.info(`${chalk.magenta("[PING]")} Server is ${chalk.inverse("Offline")}`);
                if (svrdata.online){
                    svrdata.online = false;
                    client.user.setPresence({ game: { name: 'a waiting game' }, status: 'dnd' });
                }
            }else{
                console.info(`${chalk.magenta(`[PING]`)} Server is ${chalk.bgGreen("Online")} with ${svrdata.players.online}/${svrdata.players.max} online players`);
                if (!svrdata.online){
                    svrdata.online = true;
                    client.user.setPresence({status: "online",type: "WATCHING",message: "out for bad boys on the server"});
                }
                if (res.ip != svrdata.direct.ip || res.port != svrdata.direct.port){svrdata.direct = {ip: res.ip, port: res.port}};
                if (res.motd.clean[0] != svrdata.motd){svrdata.motd = res.motd.clean[0]};
                if (res.players != svrdata.players){svrdata.players = res.players};
                if (res.version != svrdata.version){svrdata.version = res.version};
                if (Object.values(res.mods.raw) != svrdata.mods){svrdata.mods = Object.values(res.mods.raw)};
                if (res.icon != svrdata.icon){
                    svrdata.icon = res.icon;
                    var image = svrdata.icon.replace(/^data:image\/png;base64,/, "");
                    fs.writeFile("tmp.png", image, 'base64', e => {if (!!e){console.error(`${chalk.red("[ERROR]")} ${e.toString()}`)}});
                };
            }
            var time = new Date();
            if (time.getUTCHours() == 23){
                var hour = "00";
            }else if(time.getUTCHours().toString().length == 1){
                var hour = "0"+time.getUTCHours().toString();;
            }else{
                var hour = (time.getUTCHours()+1).toString();
            };
            if (time.getUTCMinutes().toString().length == 1){
                var minute = "0"+time.getUTCMinutes().toString();
            }else{var minute = time.getUTCMinutes()};
            svrdata.updated = `Last updated: ${hour}:${minute} CET`

            update_message()
        });
    })
    .on('error', (e) => {
        console.error(`${chalk.red("[ERROR]")} ${e.toString()}`)
    });
}

function update_message(){
    var embed = new discord.RichEmbed()
    .setTitle(svrdata.hostname)
    .setDescription(`Server status for ${config.ServerData.hostname}`)
    .setThumbnail("attachment://file.png")
    .attachFile({
        attachment: './tmp.png',
        name: 'file.png'
    })
    .setFooter(svrdata.updated);
    if (svrdata.online){
        embed
        .setColor(65280)
        .addField("Online",`\n\n${svrdata.motd}\nVersion: ${svrdata.version}\nMotd: ${svrdata.players.online}/${svrdata.players.max} players online`);
    }else if (!svrdata.online){
        embed
        .addField("Offline", ":(")
        .setColor(16711680);
    };

    Object.keys(config.messages).forEach(channelid => {
        var channel = client.channels.get(channelid);
        channel.fetchMessage(config.messages[channelid])
        .catch(
            e => {
                if (e.message === "404: Not Found"){
                    msg = false
                }else{
                    console.error(`${chalk.red("[ERROR]")} ${e.toString()}`);
                }
            })
        .then(msg => {
            if (!msg){
                channel.send(embed)
                .then(msg => {
                    config.messages[channelid]=msg.id;
                    fs.writeFileSync("config.json", JSON.stringify(config, null, " "), 'utf8');
                })
                .catch(e => console.error(`${chalk.red("[ERROR]")} ${e.toString()}`));
            }else{
                msg.edit(embed);
            }                
        });
    })
}

client.on('ready', () => {
    console.log(`${chalk.green("[READY]")} Logged in as: ${client.user.tag}`);
    ping_server();
    setInterval(function() {ping_server()}, 60000);
});

client.on("error", (e) => console.error(`${chalk.red("[ERROR]")} ${e.toString()}`));
client.on("warn", (e) => console.warn(`${chalk.yellow("[WARN]")} ${e.toString()}`));
client.on("debug", (e) => console.info(chalk.gray(`[INFO] ${e}`)));

client.login(config.token);