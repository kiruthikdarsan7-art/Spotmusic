import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../theme.dart';
import '../auth/auth_controller.dart';
import '../auth/auth_repository.dart';

/// Account tab: devices, log out, delete account. Playlists, downloads and settings join it in later phases.
class ProfileTab extends ConsumerStatefulWidget {
  const ProfileTab({super.key});

  @override
  ConsumerState<ProfileTab> createState() => _ProfileTabState();
}

class _ProfileTabState extends ConsumerState<ProfileTab> {
  late Future<List<DeviceSession>> _devices = ref.read(authRepositoryProvider).devices();

  Future<void> _remove(DeviceSession d) async {
    await ref.read(authRepositoryProvider).removeDevice(d.id);
    setState(() => _devices = ref.read(authRepositoryProvider).devices());
  }

  Future<void> _delete(AppUser user) async {
    final pw = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: const Text('Delete your account?'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          const Text('This permanently removes your account and data. It can\'t be undone.'),
          if (user.hasPassword) ...[
            const SizedBox(height: 12),
            TextField(
              controller: pw,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Confirm with your password'),
            ),
          ],
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(c, true), child: const Text('Delete')),
        ],
      ),
    );
    if (ok != true) return;
    final err = await ref
        .read(authControllerProvider.notifier)
        .deleteAccount(user.hasPassword ? pw.text : null);
    if (err != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authControllerProvider).value;
    if (user == null) return const SizedBox.shrink();
    return Scaffold(
      appBar: AppBar(title: const Text('Profile'), backgroundColor: Colors.transparent),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text('Hi, ${user.displayName}',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text(user.email, style: const TextStyle(color: kMuted)),
          const SizedBox(height: 8),
          const SizedBox(height: 28),
          Text('Your devices', style: Theme.of(context).textTheme.titleMedium),
          FutureBuilder<List<DeviceSession>>(
            future: _devices,
            builder: (context, snap) {
              if (!snap.hasData) return const Padding(padding: EdgeInsets.all(16), child: LinearProgressIndicator());
              return Column(
                children: [
                  for (final d in snap.data!)
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(d.name),
                      subtitle: d.current ? const Text('This device') : null,
                      trailing: d.current
                          ? null
                          : IconButton(
                              tooltip: 'Sign out this device',
                              icon: const Icon(Icons.logout),
                              onPressed: () => _remove(d),
                            ),
                    ),
                ],
              );
            },
          ),
          const SizedBox(height: 24),
          OutlinedButton(
            onPressed: () => ref.read(authControllerProvider.notifier).signOut(),
            child: const Text('Log out'),
          ),
          const SizedBox(height: 12),
          TextButton(
            onPressed: () => _delete(user),
            child: Text('Delete account', style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ),
        ],
      ),
    );
  }
}
