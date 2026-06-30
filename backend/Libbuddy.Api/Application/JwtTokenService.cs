using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Libbuddy.Api.Domain;
using Microsoft.IdentityModel.Tokens;

namespace Libbuddy.Api.Application;

public interface IJwtTokenService
{
    string CreateToken(User user, IReadOnlyList<string> roles);
}

public class JwtTokenService(IConfiguration configuration) : IJwtTokenService
{
    public string CreateToken(User user, IReadOnlyList<string> roles)
    {
        var secret = configuration["Jwt:Secret"]
            ?? throw new InvalidOperationException("Jwt:Secret is missing.");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.FullName)
        };

        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

        var token = new JwtSecurityToken(
            issuer: configuration["Jwt:Issuer"],
            audience: configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
