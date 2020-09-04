## dev-cmd

`dev` is a command-line tool that modifies commands before run.

```shell
npm i -g @hyrious/dev-cmd
dev --add proxy ... -c http.proxy=socks5://localhost:1080
# proxy = ... -c http.proxy=socks5://localhost:1080
dev proxy git clone XXX
# actually run: git clone XXX -c http.proxy=socks5://localhost:1080
dev --remove proxy
# removed proxy
```

The simplest example above just replaces `...` with original command line,
where it was `git clone XXX`.

Now let's add something more useful than that!

### `--add {cmd} {rule}` / `-A`

Add/replace `{cmd}` with rule after it. If no rule presents, it does nothing.

```
dev -A hello echo "hello world!"
dev hello
=> hello world!
```

**! Note**: Windows users will encounter errors bacause `echo` is not a program but a shell command.

#### `--starts-with {prefix}` / `=`

Works only when original command starts with `{prefix}`. For example,

```
dev -A proxy = git ... -c http.proxy=socks5://localhost:1080
```

means that, only `dev proxy git XXX` will be modified by this rule.

Different `{prefix}` won't affect other rules imported by the same `{cmd}`,
which means you can do this:

```
dev -A proxy ... --http-proxy=http://localhost:1080
dev -A proxy = git ... -c http.proxy=socks5://localhost:1080
dev -A proxy = aria2c ... --all-proxy=http://localhost:1080
dev -A proxy = scoop scoop config proxy http://localhost:1080 && ...
```

### `--remove {cmd} [--all]` / `-R`

Remove `{cmd}`. It won't affect rules with `{prefix}` having the same `{cmd}`.
To remove them too, add `--all`.

#### `--starts-with {prefix}` / `=`

Just like `-A`, remove specific `{cmd}` and `{prefix}`.

```
dev -R proxy
dev -R proxy = git
dev -R proxy --all
```

### `--plugin {path/to/plugin.js} [--save]` / `-P`

You can add more complex rules with plugins. Here is an example.

```js
module.exports = dev =>
  dev.add('proxy', {
      // you can use regex here, but keep in mind it only
      // matches the first argument, which is the command itself,
      // like `git`, `scoop`
      startsWith: 'scoop',
      run(cmd) {
          dev.sh('scoop', ['config', 'proxy', 'http://localhost:1080'])
          dev.sh(cmd)
      },
      remove() {
          dev.sh('scoop', ['config', 'rm', 'proxy'])
      }
  })
```
If `--save` presents, it will write this plugin's path into `.dev.json`'s
`plugins` list, see below.

### `--list` / `-L`

Show rules.

### `.dev.json`

`dev` will automatically load `.dev.json` at current & home folder.

```json
{ "rules": [
    { "name": "proxy",
      "startsWith": "git",
      "run": ["...", "-c", "http.proxy=socks5://localhost:1080"]
    }
  ],
  "plugins": [
    "~/plugin.js"
  ]
}
```
