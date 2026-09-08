"""Reject native libraries whose ELF load segments cannot support 16 KB pages."""
import struct
import sys
import zipfile


def verify(archive):
    count = 0
    with zipfile.ZipFile(archive) as package:
        for name in package.namelist():
            if not name.endswith('.so'):
                continue
            data = package.read(name)
            if data[:4] != b'\x7fELF' or data[5] not in (1, 2):
                raise ValueError(f'{name}: invalid ELF')
            endian = '<' if data[5] == 1 else '>'
            if data[4] == 2:
                offset = struct.unpack_from(endian + 'Q', data, 32)[0]
                size, number = struct.unpack_from(endian + 'HH', data, 54)
                alignment_offset, alignment_type = 48, 'Q'
            elif data[4] == 1:
                offset = struct.unpack_from(endian + 'I', data, 28)[0]
                size, number = struct.unpack_from(endian + 'HH', data, 42)
                alignment_offset, alignment_type = 28, 'I'
            else:
                raise ValueError(f'{name}: unsupported ELF class')
            loads = 0
            for index in range(number):
                header = offset + index * size
                if struct.unpack_from(endian + 'I', data, header)[0] != 1:
                    continue
                loads += 1
                alignment = struct.unpack_from(endian + alignment_type, data, header + alignment_offset)[0]
                if alignment < 16384:
                    raise ValueError(f'{name}: PT_LOAD alignment {alignment}, needs at least 16384')
            if not loads:
                raise ValueError(f'{name}: no load segments')
            count += 1
    print(f'{archive}: {count} native libraries support 16 KB load alignment')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit('Usage: verify-android-native-libs.py app.apk [app.aab]')
    for archive in sys.argv[1:]:
        verify(archive)
