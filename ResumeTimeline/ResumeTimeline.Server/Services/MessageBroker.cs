using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

public class MessageBroker : IDisposable
{
    private static readonly Dictionary<string, List<TaskCompletionSource<string>>> _subscribers
        = new Dictionary<string, List<TaskCompletionSource<string>>>();

    private static readonly object _lock = new object();

    public static IDisposable Subscribe(string folderId, TaskCompletionSource<string> subscriber)
    {
        lock (_lock)
        {
            if (!_subscribers.ContainsKey(folderId))
            {
                _subscribers[folderId] = new List<TaskCompletionSource<string>>();
            }
            _subscribers[folderId].Add(subscriber);
        }

        return new SubscriptionHandle(() => Unsubscribe(folderId, subscriber));
    }

    public static void Publish(string folderId, string message)
    {
        List<TaskCompletionSource<string>> subscribers;

        lock (_lock)
        {
            if (!_subscribers.ContainsKey(folderId))
            {
                return;
            }
            subscribers = _subscribers[folderId];
            _subscribers.Remove(folderId);
        }

        foreach (var subscriber in subscribers)
        {
            subscriber.TrySetResult(message);
        }
    }

    private static void Unsubscribe(string folderId, TaskCompletionSource<string> subscriber)
    {
        lock (_lock)
        {
            if (_subscribers.ContainsKey(folderId))
            {
                _subscribers[folderId].Remove(subscriber);
                if (!_subscribers[folderId].Any())
                {
                    _subscribers.Remove(folderId);
                }
            }
        }
    }

    private class SubscriptionHandle : IDisposable
    {
        private readonly Action _onDispose;
        private bool _disposed;

        public SubscriptionHandle(Action onDispose)
        {
            _onDispose = onDispose;
        }

        public void Dispose()
        {
            if (!_disposed)
            {
                _onDispose();
                _disposed = true;
            }
        }
    }

    public void Dispose()
    {
        // Cleanup code if needed
    }
}
