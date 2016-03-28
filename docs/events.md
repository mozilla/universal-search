# Event reference

Events that flow through the global event broker (`app.events`, invoked as
`this.events` by individual modules):

## `urlbar-change`

When the user types a printable key in the urlbar, the complete string in
the urlbar is fired as the body of this event.

```
{
  query: 'the mar'
}
```

- query: unicode string contents of the urlbar
