export class SyncRequestedEvent {
  constructor(
    public readonly espConnectionId: string,
    public readonly userId: string
  ) {}
}
